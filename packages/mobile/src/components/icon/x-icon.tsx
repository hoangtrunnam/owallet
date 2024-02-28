import React, { FunctionComponent } from "react";
import Svg, { Path } from "react-native-svg";

export const XIcon: FunctionComponent<{
  size?: number;
  color?: string;
}> = ({ size, color = "#C7C7CC" }) => {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        d="M5.58934 4.41009C5.2639 4.08466 4.73626 4.08466 4.41083 4.41009C4.08539 4.73553 4.08539 5.26317 4.41083 5.5886L8.82158 9.99936L4.41085 14.4101C4.08541 14.7355 4.08541 15.2632 4.41085 15.5886C4.73629 15.914 5.26392 15.914 5.58936 15.5886L10.0001 11.1779L14.4108 15.5886C14.7363 15.9141 15.2639 15.9141 15.5893 15.5886C15.9148 15.2632 15.9148 14.7355 15.5893 14.4101L11.1786 9.99936L15.5894 5.58861C15.9148 5.26317 15.9148 4.73553 15.5894 4.41009C15.2639 4.08466 14.7363 4.08466 14.4109 4.41009L10.0001 8.82085L5.58934 4.41009Z"
        fill={color}
      />
    </Svg>
  );
};
