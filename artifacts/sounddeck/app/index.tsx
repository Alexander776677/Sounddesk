import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioModule, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type PlaybackMode = 'hold' | 'play' | 'loop' | null;

type SoundItem = {
  id: string;
  name: string;
  fileUri: string | null;
  fileName: string | null;
};

const STORAGE_KEY = '@sounddeck/sounds-v1';
const ACCEPTED_AUDIO_TYPES = [
  'audio/*',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/vorbis',
];

const DEFAULT_NAMES = ['Intro sting', 'Crowd cheer', 'Impact hit', 'Atmosphere', 'Outro sting'];

function defaultSounds(): SoundItem[] {
  return DEFAULT_NAMES.map((name, index) => ({
    id: `sound-${index + 1}`,
    name,
    fileUri: null,
    fileName: null,
  }));
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extensionFor(name: string | undefined, mimeType: string | undefined): string {
  const fromName = name?.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  const mimeMap: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
    'audio/vorbis': '.ogg',
  };
  return mimeMap[mimeType ?? ''] ?? '.audio';
}

function formatFileName(item: SoundItem): string {
  if (!item.fileName) return 'Keine Datei importiert';
  return item.fileName.length > 28 ? `${item.fileName.slice(0, 25)}…` : item.fileName;
}

function WaveMark({ color }: { color: string }) {
  return (
    <View style={styles.waveMark} accessibilityLabel="SoundDeck">
      {[14, 25, 36, 22, 31, 18, 28].map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={[styles.waveBar, { height, backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

function RoundIconButton({
  icon,
  onPress,
  colors,
  accessibilityLabel,
  disabled = false,
  active = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  accessibilityLabel: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: active ? colors.primary : colors.secondary,
          borderColor: active ? colors.primary : colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={19}
        color={active ? colors.primaryForeground : colors.foreground}
      />
    </Pressable>
  );
}

function PlayerControls({
  sound,
  colors,
}: {
  sound: SoundItem;
  colors: ReturnType<typeof useColors>;
}) {
  const source = sound.fileUri ? { uri: sound.fileUri } : null;
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [mode, setMode] = useState<PlaybackMode>(null);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    if (!sound.fileUri) {
      setMode(null);
      setIsHolding(false);
      player.pause();
      player.seekTo(0);
    }
  }, [player, sound.fileUri]);

  const stopAndReset = () => {
    player.pause();
    player.seekTo(0);
    setMode(null);
  };

  const handleHoldStart = () => {
    if (!sound.fileUri) return;
    Keyboard.dismiss();
    player.loop = false;
    player.seekTo(0);
    player.play();
    setIsHolding(true);
    setMode('hold');
  };

  const handleHoldEnd = () => {
    if (!isHolding) return;
    player.pause();
    player.seekTo(0);
    setIsHolding(false);
    setMode(null);
  };

  const handlePlay = () => {
    if (!sound.fileUri) return;
    Keyboard.dismiss();
    if (status.playing) {
      stopAndReset();
      return;
    }
    player.loop = false;
    player.seekTo(0);
    player.play();
    setMode('play');
  };

  const handleLoop = () => {
    if (!sound.fileUri) return;
    Keyboard.dismiss();
    if (status.playing && mode === 'loop') {
      stopAndReset();
      player.loop = false;
      return;
    }
    player.loop = true;
    player.seekTo(0);
    player.play();
    setMode('loop');
  };

  const hasFile = Boolean(sound.fileUri);
  const playActive = Boolean(status.playing && mode === 'play');
  const loopActive = Boolean(status.playing && mode === 'loop');

  return (
    <View style={styles.controls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Hold to play ${sound.name}`}
        disabled={!hasFile}
        onPressIn={handleHoldStart}
        onPressOut={handleHoldEnd}
        style={({ pressed }) => [
          styles.holdButton,
          {
            borderColor: isHolding ? colors.accent : colors.border,
            backgroundColor: isHolding ? `${colors.accent}20` : colors.secondary,
            opacity: !hasFile ? 0.4 : pressed ? 0.76 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="gesture-tap-hold"
          size={17}
          color={isHolding ? colors.accent : colors.foreground}
        />
        <Text style={[styles.controlLabel, { color: colors.foreground }]}>Hold</Text>
      </Pressable>
      <RoundIconButton
        icon={playActive ? 'stop' : 'play'}
        onPress={handlePlay}
        colors={colors}
        accessibilityLabel={playActive ? `Stop ${sound.name}` : `Play ${sound.name}`}
        disabled={!hasFile}
        active={playActive}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loopActive ? `Stop loop ${sound.name}` : `Loop ${sound.name}`}
        disabled={!hasFile}
        onPress={handleLoop}
        style={({ pressed }) => [
          styles.loopButton,
          {
            backgroundColor: loopActive ? `${colors.primary}22` : colors.secondary,
            borderColor: loopActive ? colors.primary : colors.border,
            opacity: !hasFile ? 0.4 : pressed ? 0.72 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="repeat"
          size={18}
          color={loopActive ? colors.primary : colors.foreground}
        />
        <Text
          style={[
            styles.controlLabel,
            { color: loopActive ? colors.primary : colors.foreground },
          ]}
        >
          Loop
        </Text>
      </Pressable>
    </View>
  );
}

function SoundRow({
  sound,
  colors,
  onChangeName,
  onImport,
  onRemoveFile,
}: {
  sound: SoundItem;
  colors: ReturnType<typeof useColors>;
  onChangeName: (name: string) => void;
  onImport: () => void;
  onRemoveFile: () => void;
}) {
  return (
    <View style={[styles.soundCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowHeader}>
        <View style={styles.trackBadge}>
          <MaterialCommunityIcons name="music-note" size={16} color={colors.primary} />
        </View>
        <TextInput
          accessibilityLabel="Soundname"
          value={sound.name}
          onChangeText={onChangeName}
          placeholder="Soundname"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          style={[styles.nameInput, { color: colors.foreground, borderBottomColor: colors.border }]}
          maxLength={42}
          onSubmitEditing={Keyboard.dismiss}
        />
        <Text style={[styles.trackNumber, { color: colors.mutedForeground }]}>
          {sound.id.startsWith('sound-') ? sound.id.replace('sound-', '').padStart(2, '0') : '＋'}
        </Text>
      </View>

      <View style={styles.fileRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Import audio for ${sound.name}`}
          onPress={onImport}
          style={({ pressed }) => [
            styles.importButton,
            { backgroundColor: `${colors.primary}18`, opacity: pressed ? 0.68 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="file-music-outline" size={17} color={colors.primary} />
          <Text style={[styles.importLabel, { color: colors.primary }]}>
            {sound.fileUri ? 'Datei ersetzen' : 'Audiodatei importieren'}
          </Text>
        </Pressable>
        <RoundIconButton
          icon="trash-can-outline"
          onPress={onRemoveFile}
          colors={colors}
          accessibilityLabel={`Remove file from ${sound.name}`}
          disabled={!sound.fileUri}
        />
      </View>

      <View style={styles.fileMeta}>
        <MaterialCommunityIcons
          name={sound.fileUri ? 'check-circle' : 'information-outline'}
          size={14}
          color={sound.fileUri ? colors.accent : colors.mutedForeground}
        />
        <Text style={[styles.fileText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {formatFileName(sound)}
        </Text>
      </View>
      <PlayerControls sound={sound} colors={colors} />
    </View>
  );
}

export default function SoundDeckScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sounds, setSounds] = useState<SoundItem[]>(defaultSounds);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => undefined);
    void AudioModule.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored) as SoundItem[];
          if (Array.isArray(parsed) && parsed.length > 0) setSounds(parsed);
        } catch {
          // Keep the safe five-row default when stored data is invalid.
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sounds));
  }, [isLoaded, sounds]);

  const fileCount = useMemo(() => sounds.filter((sound) => sound.fileUri).length, [sounds]);

  const updateSound = (id: string, updates: Partial<SoundItem>) => {
    setSounds((current) =>
      current.map((sound) => (sound.id === id ? { ...sound, ...updates } : sound)),
    );
  };

  const importSound = async (id: string) => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_AUDIO_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const extension = extensionFor(asset.name, asset.mimeType);
      const destination = `${FileSystem.documentDirectory}sounddeck-${id}-${Date.now()}${extension}`;
      await FileSystem.copyAsync({ from: asset.uri, to: destination });

      const previous = sounds.find((sound) => sound.id === id)?.fileUri;
      if (previous && previous !== destination) {
        await FileSystem.deleteAsync(previous, { idempotent: true }).catch(() => undefined);
      }
      updateSound(id, { fileUri: destination, fileName: asset.name ?? `Sound${extension}` });
    } catch {
      Alert.alert('Import fehlgeschlagen', 'Die Audiodatei konnte nicht übernommen werden.');
    } finally {
      setIsImporting(false);
    }
  };

  const removeFile = (sound: SoundItem) => {
    if (!sound.fileUri) return;
    Alert.alert('Audiodatei entfernen?', `„${sound.fileName ?? sound.name}“ wird aus SoundDeck gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen',
        style: 'destructive',
        onPress: () => {
          void FileSystem.deleteAsync(sound.fileUri as string, { idempotent: true }).catch(() => undefined);
          updateSound(sound.id, { fileUri: null, fileName: null });
        },
      },
    ]);
  };

  const addSound = () => {
    setSounds((current) => [
      ...current,
      { id: createId(), name: `Sound ${current.length + 1}`, fileUri: null, fileName: null },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 28),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <WaveMark color={colors.primaryForeground} />
            </View>
            <View>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>LIVE SOUND</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>SoundDeck</Text>
            </View>
          </View>
          <View style={[styles.livePill, { backgroundColor: `${colors.accent}18` }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.liveText, { color: colors.accent }]}>READY</Text>
          </View>
        </View>

        <View style={styles.introRow}>
          <View>
            <Text style={[styles.heading, { color: colors.foreground }]}>Your soundboard</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              Import sounds and trigger them instantly.
            </Text>
          </View>
          <View style={[styles.countPill, { borderColor: colors.border }]}>
            <Text style={[styles.countValue, { color: colors.foreground }]}>{fileCount}</Text>
            <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>loaded</Text>
          </View>
        </View>

        <View style={[styles.tip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="lock-outline" size={17} color={colors.accent} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            Sounds keep playing when your screen is locked.
          </Text>
        </View>

        <View style={styles.list}>
          {sounds.map((sound) => (
            <SoundRow
              key={sound.id}
              sound={sound}
              colors={colors}
              onChangeName={(name) => updateSound(sound.id, { name })}
              onImport={() => void importSound(sound.id)}
              onRemoveFile={() => removeFile(sound)}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add sound row"
          onPress={addSound}
          style={({ pressed }) => [
            styles.addButton,
            {
              borderColor: colors.primary,
              backgroundColor: `${colors.primary}12`,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={[styles.plusCircle, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.primaryForeground} />
          </View>
          <View>
            <Text style={[styles.addTitle, { color: colors.foreground }]}>Add sound row</Text>
            <Text style={[styles.addCaption, { color: colors.mutedForeground }]}>
              Expand your deck
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.primary} />
        </Pressable>

        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          MP3 · WAV · M4A / AAC · OGG
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  logo: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  waveMark: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  waveBar: { borderRadius: 2, width: 3 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.7 },
  livePill: {
    alignItems: 'center',
    borderRadius: 99,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveDot: { borderRadius: 5, height: 7, width: 7 },
  liveText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  introRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  heading: { fontSize: 27, fontWeight: '700', letterSpacing: -0.8 },
  subheading: { fontSize: 13, marginTop: 5 },
  countPill: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  countValue: { fontSize: 18, fontWeight: '700', lineHeight: 19 },
  countLabel: { fontSize: 9, letterSpacing: 0.3, marginTop: 1 },
  tip: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },
  list: { gap: 12 },
  soundCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  rowHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  trackBadge: {
    alignItems: 'center',
    backgroundColor: '#FF7A5920',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  nameInput: {
    borderBottomWidth: 1,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 7,
    paddingHorizontal: 0,
    paddingTop: 3,
  },
  trackNumber: { fontSize: 11, fontWeight: '600', minWidth: 20, textAlign: 'right' },
  fileRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 14 },
  importButton: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 11,
  },
  importLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  iconButton: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  fileMeta: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 9, paddingHorizontal: 2 },
  fileText: { flex: 1, fontSize: 11 },
  controls: { flexDirection: 'row', gap: 8, marginTop: 14 },
  holdButton: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
  },
  loopButton: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1.35,
    flexDirection: 'row',
    gap: 7,
    height: 42,
    justifyContent: 'center',
  },
  controlLabel: { fontSize: 12, fontWeight: '600' },
  addButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  plusCircle: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  addTitle: { fontSize: 14, fontWeight: '700' },
  addCaption: { fontSize: 11, marginTop: 3 },
  footerText: { fontSize: 10, letterSpacing: 0.7, marginTop: 22, textAlign: 'center' },
});