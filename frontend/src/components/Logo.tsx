import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface LogoProps {
  size?: number;
  heartColor?: string;
  showBackground?: boolean;
}

/**
 * FamilyCare Organizer Logo
 * A terra cotta heart with caring hands overlaid - symbolizing family caregiving support
 */
export function Logo({ 
  size = 80, 
  heartColor = '#D97757',
  showBackground = true 
}: LogoProps) {
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Heart background with circular clip */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.heartSvg}>
        {showBackground && (
          <Circle cx="50" cy="50" r="48" fill={heartColor} />
        )}
        {/* Heart shape - slightly transparent */}
        <Path
          d="M50 85 C50 85 15 55 15 35 C15 22 25 15 38 15 C46 15 50 22 50 22 C50 22 54 15 62 15 C75 15 85 22 85 35 C85 55 50 85 50 85 Z"
          fill="#FFFFFF"
          opacity={0.2}
        />
      </Svg>
      
      {/* Hands overlay - with proper styling for visibility */}
      <Image 
        source={require('../../assets/images/hands-logo.png')}
        style={[
          styles.handsImage,
          { 
            width: size * 0.72, 
            height: size * 0.72,
          },
          // Use tintColor on native, opacity adjustment on web
          Platform.OS !== 'web' ? { tintColor: '#FFFFFF' } : { opacity: 0.85 }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * Simplified Logo for small sizes (tabs, icons) - just heart with hands
 */
export function LogoSimple({ 
  size = 40, 
  heartColor = '#D97757',
}: { size?: number; heartColor?: string }) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill={heartColor} />
        <Path
          d="M50 82 C50 82 18 55 18 36 C18 24 27 18 39 18 C47 18 50 24 50 24 C50 24 53 18 61 18 C73 18 82 24 82 36 C82 55 50 82 50 82 Z"
          fill="#FFFFFF"
          opacity={0.2}
        />
      </Svg>
      <Image 
        source={require('../../assets/images/hands-logo.png')}
        style={[
          styles.handsImageSmall,
          { 
            width: size * 0.65, 
            height: size * 0.65,
          },
          Platform.OS !== 'web' ? { tintColor: '#FFFFFF' } : { opacity: 0.85 }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartSvg: {
    position: 'absolute',
  },
  handsImage: {
    // The image has black lines on transparent background
    // On native: tintColor will make them white
    // On web: we show the original black lines which look nice against the coral
  },
  handsImageSmall: {
    // Same as above for smaller version
  },
});

export default Logo;
