import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDuration, durationColour, qualityColour } from '../utils/format';
import { useColours } from '../store/themeStore';
import { SleepLog, durationHours } from '../store/sleepStore';

type Props = {
  log: SleepLog;
};

const SleepLogCard: React.FC<Props> = ({ log }) => {
  const duration = durationHours(log);
  const colours = useColours();

  return (
    <View style={[styles.card, { backgroundColor: colours.card }]}>
      {/* Start & End ---------------------------------------------------- */}
      <View style={styles.row}>
        <Text style={[styles.time, { color: colours.text }]}>
          {new Date(log.start).toLocaleString()}
        </Text>
        <Text style={[styles.arrow, { color: colours.text }]}>→</Text>
        <Text style={[styles.time, { color: colours.text }]}>
          {log.end ? new Date(log.end).toLocaleString() : '—'}
        </Text>
      </View>

      {/* Duration ------------------------------------------------------- */}
      {duration !== null && (
        <Text style={[styles.meta, { color: durationColour(duration) }]}>
          Duration: {formatDuration(duration)}
        </Text>
      )}

      {/* Quality -------------------------------------------------------- */}
      {log.quality !== undefined && (
        <Text style={[styles.meta, { color: qualityColour(log.quality ?? 0) }]}>
          Quality: {log.quality}/10
        </Text>
      )}

      {/* Tags ----------------------------------------------------------- */}
      {log.tags.length > 0 && (
        <Text style={[styles.tags, { color: colours.text }]}>{log.tags.join(', ')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginVertical: 6,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  time: {
    fontWeight: '500',
  },
  arrow: {
    marginHorizontal: 4,
  },
  meta: {
    marginTop: 4,
    color: '#555',
  },
  tags: {
    marginTop: 4,
    color: '#777',
  },
});

export default SleepLogCard;
