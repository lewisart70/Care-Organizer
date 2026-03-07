import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
}

/**
 * FamilyCare Organizer Logo
 * Terra cotta heart with caring hands - symbolizing family caregiving support
 */
export function Logo({ size = 80 }: LogoProps) {
  return (
    <Image 
      source={require('../../assets/images/logo.png')}
      style={[
        styles.logo,
        { 
          width: size, 
          height: size,
        }
      ]}
      resizeMode="contain"
    />
  );
}

/**
 * Simplified Logo for small sizes (tabs, icons)
 */
export function LogoSimple({ size = 40 }: { size?: number }) {
  return (
    <Image 
      source={require('../../assets/images/logo.png')}
      style={[
        styles.logo,
        { 
          width: size, 
          height: size,
        }
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // Logo maintains aspect ratio
  },
});

export default Logo;
