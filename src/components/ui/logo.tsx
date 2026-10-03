import Image from "next/image";

interface LogoProps {
  size?: number;
}

export function Logo({ size = 32 }: LogoProps) {
  return (
    <Image
      src="/logo-mark.png"
      alt="캠퍼스런 로고"
      width={size}
      height={size}
      className="shrink-0"
      priority
    />
  );
}
