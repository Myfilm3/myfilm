type LoaderProps = { label?: string };

export default function Loader({ label = 'Cargando…' }: LoaderProps) {
  return (
    <div className="inline-flex items-center gap-2 text-gray-600">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-gray-400" />
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-gray-400 [animation-delay:.15s]" />
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-gray-400 [animation-delay:.3s]" />
      <span className="ml-2">{label}</span>
    </div>
  );
}