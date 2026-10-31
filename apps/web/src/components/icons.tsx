type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const CheckIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12.5 10 17.5 19 7.5" />
  </svg>
);

export const CrossIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const AlertIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 8.5v4.5M12 16.5h.01" />
    <path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);

export const MinusIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M7 12h10" />
  </svg>
);

export const InfoIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5h.01" />
  </svg>
);

export const LockIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const ExternalIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M14 5h5v5M19 5l-8 8M18 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
  </svg>
);

export const UploadIcon = ({ className = "size-6" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 15V4.5M7.5 9 12 4.5 16.5 9" />
    <path d="M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </svg>
);

export const CameraIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const DownloadIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </svg>
);

export const SwitchCameraIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4.5v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 19.5v-4h4" />
  </svg>
);

export const ArrowRightIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeftIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const FileIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8Z" />
    <path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" />
  </svg>
);

export const ShieldIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const BookIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h12.5v13H6a1.5 1.5 0 0 0-1.5 1.5Z" />
    <path d="M4.5 18.5A1.5 1.5 0 0 0 6 20h12.5v-3M8.5 8h6M8.5 11h4" />
  </svg>
);

export const SparkIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </svg>
);
