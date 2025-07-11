import React, { useState } from 'react';
import { View, Button, ToastAndroid, Platform, Switch, Alert, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { importLogs, exportLogs, useSleepStore } from '../store/sleepStore';
import { useThemeStore } from '../store/themeStore';
import { useColours } from '../store/themeStore';

function toast(msg: string) {
  Platform.OS === 'android'
    ? ToastAndroid.show(msg, ToastAndroid.SHORT)
    : alert(msg);
}

async function readJsonFile(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export default function SettingsScreen() {
  const [importing, setImporting] = useState(false);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const colours = useColours();
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colours.background }}>
      {/* Theme toggle ---------------------------------------------------- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ flex: 1, color: colours.text }}>Dark mode</Text>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} />
      </View>
      <Button
        title="Import data"
        disabled={importing}
        onPress={async () => {
          setImporting(true);
          try {
            const res = await DocumentPicker.getDocumentAsync({
              type: 'application/json',
              copyToCacheDirectory: true,
            });
            if (res.canceled) {
              setImporting(false);
              return;
            }
            const uri =
              (res as any).assets?.[0]?.uri ?? (res as any).uri;
            const txt = await readJsonFile(uri);
            const data = JSON.parse(txt);
            const counts = await importLogs(data);
            if (counts.added === 0) {
              toast('No new records');
            } else {
              toast(
                `Imported ${counts.added} (skipped ${counts.skipped}`,
              );
            }
          } catch {
            toast('Import failed');
          } finally {
            setImporting(false);
          }
        }}
      />
      <View style={{ height: 12 }} />
      <Button
        title="Delete all data"
        color="#d9534f"
        onPress={() => {
          Alert.alert(
            'Delete all data',
            'This action cannot be undone. Are you sure you want to delete all sleep logs?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await useSleepStore.getState().clear();
                    toast('All data deleted');
                  } catch {
                    toast('Failed to delete data');
                  }
                },
              },
            ],
            { cancelable: true },
          );
        }}
      />
      <View style={{ height: 12 }} />
      <Button
        title="Export data"
        onPress={async () => {
          try {
            const uri = await exportLogs();
            await Sharing.shareAsync(uri);
          } catch (e) {
            toast('Export failed');
          }
        }}
      />
    </View>
  );
}
