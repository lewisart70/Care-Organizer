import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';

// Pre-defined icon components to avoid recreating on each render
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="home" size={size} color={color} />
);

const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="person" size={size} color={color} />
);

const MedsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="medkit" size={size} color={color} />
);

const NotesIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="document-text" size={size} color={color} />
);

const MoreIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="grid" size={size} color={color} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ProfileIcon,
        }}
      />
      <Tabs.Screen
        name="medications-tab"
        options={{
          title: 'Meds',
          tabBarIcon: MedsIcon,
        }}
      />
      <Tabs.Screen
        name="notes-tab"
        options={{
          title: 'Notes',
          tabBarIcon: NotesIcon,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: MoreIcon,
        }}
      />
    </Tabs>
  );
}
