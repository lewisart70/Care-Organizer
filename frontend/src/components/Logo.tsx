import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface LogoProps {
  size?: number;
  heartColor?: string;
  handsColor?: string;
  backgroundColor?: string;
  showBackground?: boolean;
}

/**
 * FamilyCare Organizer Logo
 * A heart with caring hands clasped over it - symbolizing caregiving and support
 */
export function Logo({ 
  size = 80, 
  heartColor = '#FFFFFF',
  handsColor = '#FFFFFF',
  backgroundColor = '#D97757',
  showBackground = true 
}: LogoProps) {
  const viewBoxSize = 100;
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
      {/* Background Circle */}
      {showBackground && (
        <Circle cx="50" cy="50" r="48" fill={backgroundColor} />
      )}
      
      {/* Heart Shape */}
      <Path
        d="M50 82 C50 82 20 55 20 38 C20 28 28 20 38 20 C44 20 48 24 50 28 C52 24 56 20 62 20 C72 20 80 28 80 38 C80 55 50 82 50 82 Z"
        fill={heartColor}
        opacity={0.3}
      />
      
      {/* Clasped Hands - Two hands holding each other */}
      <G>
        {/* Left Hand */}
        <Path
          d="M30 52 
             C28 50 26 48 26 45 
             C26 42 28 40 31 40
             L38 40 
             C40 40 42 42 42 45
             L42 48
             C42 50 44 52 46 52"
          stroke={handsColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Left Fingers */}
        <Path
          d="M31 40 L31 36
             M34 40 L34 34
             M37 40 L37 35
             M40 40 L40 37"
          stroke={handsColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Right Hand */}
        <Path
          d="M70 52 
             C72 50 74 48 74 45 
             C74 42 72 40 69 40
             L62 40 
             C60 40 58 42 58 45
             L58 48
             C58 50 56 52 54 52"
          stroke={handsColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right Fingers */}
        <Path
          d="M69 40 L69 36
             M66 40 L66 34
             M63 40 L63 35
             M60 40 L60 37"
          stroke={handsColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Hands Clasping Together (interlocked) */}
        <Path
          d="M46 52 
             C48 54 50 56 50 58
             C50 56 52 54 54 52"
          stroke={handsColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Central clasp */}
        <Path
          d="M44 55 C47 58 53 58 56 55"
          stroke={handsColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </G>
      
      {/* Small heart accent */}
      <Path
        d="M50 68 C50 68 44 63 44 59 C44 56 46 54 48 54 C49 54 50 55 50 56 C50 55 51 54 52 54 C54 54 56 56 56 59 C56 63 50 68 50 68 Z"
        fill={handsColor}
        opacity={0.9}
      />
    </Svg>
  );
}

/**
 * Simplified Logo for small sizes (icons, tabs)
 */
export function LogoSimple({ 
  size = 40, 
  color = '#FFFFFF',
  backgroundColor = '#D97757',
  showBackground = true 
}: { size?: number; color?: string; backgroundColor?: string; showBackground?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {showBackground && (
        <Circle cx="50" cy="50" r="48" fill={backgroundColor} />
      )}
      
      {/* Heart with hands silhouette */}
      <Path
        d="M50 80 C50 80 22 55 22 38 C22 28 30 22 40 22 C46 22 50 28 50 28 C50 28 54 22 60 22 C70 22 78 28 78 38 C78 55 50 80 50 80 Z"
        fill={color}
        opacity={0.25}
      />
      
      {/* Simplified clasped hands */}
      <Path
        d="M35 48 C32 46 30 44 30 40 C30 36 34 34 38 34 L44 34
           M65 48 C68 46 70 44 70 40 C70 36 66 34 62 34 L56 34
           M44 34 C46 34 48 36 50 38 C52 36 54 34 56 34
           M44 48 C47 52 53 52 56 48"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Small heart */}
      <Path
        d="M50 65 C50 65 44 60 44 55 C44 52 46 50 49 50 C50 50 50 51 50 52 C50 51 50 50 51 50 C54 50 56 52 56 55 C56 60 50 65 50 65 Z"
        fill={color}
      />
    </Svg>
  );
}

export default Logo;
