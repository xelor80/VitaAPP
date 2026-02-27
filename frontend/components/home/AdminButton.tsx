import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AdminButtonProps {
  onPress: () => void;
}

export function AdminButton({ onPress }: AdminButtonProps) {
  return (
    <TouchableOpacity
      testID="admin-btn"
      style={adminBtnStyles.button}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <MaterialCommunityIcons name="cog" size={18} color="#64748B" />
      <Text style={adminBtnStyles.text}>Admin</Text>
    </TouchableOpacity>
  );
}

const adminBtnStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 16,
    alignSelf: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
