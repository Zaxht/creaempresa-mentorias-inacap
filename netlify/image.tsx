// La compilación estática sirve imágenes originales, sin un optimizador Next.
export default function Image({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  unoptimized?: boolean;
}) {
  return (
    // eslint-disable-next-line next/no-img-element -- Static Netlify build has no Next image server; keep private signed URLs unchanged.
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      decoding="async"
    />
  );
}
