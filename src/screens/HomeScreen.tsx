import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSleepStore, durationHours, SleepLog } from '../store/sleepStore';
import {
  formatDuration,
  durationColour,
  qualityColour,
  formatDurationDelta,
  impactColour,
} from '../utils/format';
import AddSleepModal from './AddSleepModal';
import Fab from '../components/Fab';
import { useColours } from '../store/themeStore';

/* -------------------------------------------------------------------------- */
/*                               Helper utils                                 */
/* -------------------------------------------------------------------------- */
const average = (arr: number[]) =>
  arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

type Impact = {
  tag: string;
  count: number;
  qual: number;
  dur: number;
  dq: number;
  dd: number;
};

const tagImpacts = (logs: SleepLog[]): Impact[] => {
  const tagCounts: Record<string, number> = {};
  logs.forEach((l) => l.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));

  const tags = Object.keys(tagCounts);

  const impacts: Impact[] = [];
  const avg = (arr: SleepLog[], f: (l: SleepLog) => number) => average(arr.map(f));

  for (const tag of tags) {
    const withT = logs.filter((l) => l.tags.includes(tag));
    const withoutT = logs.filter((l) => !l.tags.includes(tag));
    impacts.push({
      tag,
      count: tagCounts[tag],
      qual: avg(withT, (l) => l.quality ?? 0),
      dur: avg(withT, (l) => durationHours(l) ?? 0),
      dq: avg(withT, (l) => l.quality ?? 0) - avg(withoutT, (l) => l.quality ?? 0),
      dd:
        avg(withT, (l) => durationHours(l) ?? 0) -
        avg(withoutT, (l) => durationHours(l) ?? 0),
    });
  }
  return impacts;
};

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */
export default function HomeScreen() {
  const logs = useSleepStore((s) => s.logs);
  const colours = useColours();
  const sorted = useMemo(
    () => [...logs].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
    [logs],
  );

  /* -------------- rolling windows stats -------------- */
  const makeStats = (count: number) => {
    const slice = sorted.slice(0, Math.max(count, 1));

    const dur = slice
      .map(durationHours)
      .filter((v): v is number => v !== null);
    const qual = slice
      .map((l) => l.quality)
      .filter((v): v is number => v !== undefined);

    const impacts = tagImpacts(slice);
    const mostPositive = impacts
      .filter((i) => i.dq > 0)
      .sort((a, b) => b.dq - a.dq)[0];
    const mostNegative = impacts
      .filter((i) => i.dq < 0)
      .sort((a, b) => a.dq - b.dq)[0];

    return {
      avgDur: average(dur),
      avgQual: average(qual),
      pos: mostPositive,
      neg: mostNegative,
    };
  };

  const stats7 = useMemo(() => makeStats(7), [logs]);
  const stats28 = useMemo(() => makeStats(28), [logs]);

  /* -------------- global averages -------------- */
  const globalDur = useMemo(() => {
    const ds = logs
      .map(durationHours)
      .filter((v): v is number => v !== null);
    return average(ds);
  }, [logs]);

  const globalQual = useMemo(() => {
    const qs = logs
      .map((l) => l.quality)
      .filter((v): v is number => v !== undefined);
    return average(qs);
  }, [logs]);

  /* -------------------- add modal defaults ------------------- */
  const [addDefaults, setAddDefaults] = useState<Partial<SleepLog> | null>(null);

  const handleFabPress = () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    yesterday.setHours(0, 0, 0, 0);
    setAddDefaults({
      start: yesterday.toISOString(),
      end: now.toISOString(),
      tags: [],
    });
  };

  /* ----------- determine if we should prompt to add last night ----------- */
  const needAddLastNight =
    !logs.length ||
    new Date((sorted[0].end ?? sorted[0].start)).getTime() <
      Date.now() - 14 * 60 * 60 * 1000;

  /* --------------------------- render --------------------------- */
  const renderStatsCard = (label: string, stats: ReturnType<typeof makeStats>) => {
    const ddur = stats.avgDur - globalDur;
    const dqual = stats.avgQual - globalQual;
    return (
    <View style={[styles.card, { backgroundColor: colours.card }]}>
      <Text style={[styles.cardTitle, { color: colours.text }]}>{label}</Text>
      <Text style={[styles.cardText, { color: durationColour(stats.avgDur) }]}>
        Avg duration {formatDuration(stats.avgDur)}{' '}
        <Text style={{ color: impactColour(ddur) }}>
          ({formatDurationDelta(ddur)})
        </Text>
      </Text>
      <Text style={[styles.cardText, { color: qualityColour(stats.avgQual) }]}>
        Avg quality {stats.avgQual.toFixed(1)}{' '}
        <Text style={{ color: impactColour(dqual) }}>
          ({dqual > 0 ? '+' : ''}{dqual.toFixed(1)})
        </Text>
      </Text>
      {stats.pos && (
        <Text style={[styles.cardText, { color: colours.text }]}>
          Most positive: {stats.pos.tag}{' '}
          <Text style={{ color: qualityColour(stats.pos.qual) }}>
            {stats.pos.qual.toFixed(1)}
          </Text>{' '}
          /{' '}
          <Text style={{ color: durationColour(stats.pos.dur) }}>
            {formatDuration(stats.pos.dur)}
          </Text>
        </Text>
      )}
      {stats.neg && (
        <Text style={[styles.cardText, { color: colours.text }]}>
          Most negative: {stats.neg.tag}{' '}
          <Text style={{ color: qualityColour(stats.neg.qual) }}>
            {stats.neg.qual.toFixed(1)}
          </Text>{' '}
          /{' '}
          <Text style={{ color: durationColour(stats.neg.dur) }}>
            {formatDuration(stats.neg.dur)}
          </Text>
        </Text>
      )}
    </View>
  );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colours.background }}>
      {/* Summary cards --------------------------------------------------- */}
      <View style={styles.cardsRow}>
        {renderStatsCard('Last 7 days', stats7)}
        {renderStatsCard('Last 28 days', stats28)}
      </View>

      {needAddLastNight && (
        <TouchableOpacity style={styles.addLastBtn} onPress={handleFabPress}>
          <Text style={styles.addLastBtnText}>Add last night's sleep</Text>
        </TouchableOpacity>
      )}


      {/* Modals & FAB ---------------------------------------------------- */}
      <AddSleepModal
        visible={!!addDefaults}
        defaultValues={addDefaults ?? {}}
        onClose={() => {
          setAddDefaults(null);
        }}
      />
      <Fab onPress={handleFabPress} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  cardsRow: {
    flexDirection: 'column',
    paddingVertical: 8,
  },
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fafafa',
    elevation: 1,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 12,
    marginTop: 2,
  },
  addLastBtn: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: '#ff9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addLastBtnText: { color: '#fff', fontWeight: '600' },
});
