import React from 'react';
import { Svg, Path } from 'react-native-svg';

const LogoSVG = ({ width = 100, height = 100, color = '#ff4757' }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      <Path
        d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"
        fill={color}
      />
      <Path
        d="M65 35H35c-2.8 0-5 2.2-5 5v20c0 2.8 2.2 5 5 5h30c2.8 0 5-2.2 5-5V40c0-2.8-2.2-5-5-5zm-5 20H40v-5h20v5zm0-10H40v-5h20v5z"
        fill={color}
      />
    </Svg>
  );
};

export default LogoSVG; 