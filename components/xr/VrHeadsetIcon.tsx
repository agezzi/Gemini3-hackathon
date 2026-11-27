import React from 'react';

interface VrHeadsetIconProps {
  className?: string;
}

export const VrHeadsetIcon: React.FC<VrHeadsetIconProps> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* Top head-strap anchor */}
      <path d="M9.75 4.25C9.75 3.56 10.31 3 11 3H13C13.69 3 14.25 3.56 14.25 4.25V5.75H9.75V4.25Z" />
      {/* Left & Right side strap mounts */}
      <rect x="0.75" y="9.5" width="1.75" height="5" rx="0.85" />
      <rect x="21.5" y="9.5" width="1.75" height="5" rx="0.85" />
      {/* Main VR Visor Silhouette with nose-bridge contour */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.25 6.5C3.59 6.5 2.25 7.84 2.25 9.5V15.35C2.25 17.01 3.59 18.35 5.25 18.35H8.05C8.78 18.35 9.45 17.95 9.81 17.31L11.13 14.95C11.51 14.27 12.49 14.27 12.87 14.95L14.19 17.31C14.55 17.95 15.22 18.35 15.95 18.35H18.75C20.41 18.35 21.75 17.01 21.75 15.35V9.5C21.75 7.84 20.41 6.5 18.75 6.5H5.25ZM7.2 10.5C6.65 10.5 6.2 10.95 6.2 11.5C6.2 12.05 6.65 12.5 7.2 12.5H16.8C17.35 12.5 17.8 12.05 17.8 11.5C17.8 10.95 17.35 10.5 16.8 10.5H7.2Z"
      />
    </svg>
  );
};
