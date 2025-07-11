import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FabProps = {
  onPress: () => void;
};

const Fab: React.FC<FabProps> = ({ onPress }) => (
  <TouchableOpacity style={styles.fab} onPress={onPress}>
    <MaterialCommunityIcons name="plus" size={28} color="#fff" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196f3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});

export default Fab;
