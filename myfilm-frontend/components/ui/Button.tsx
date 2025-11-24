type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  className?: string;
};

export default function Button({ children, onClick, variant = 'primary', className = '' }: ButtonProps) {
  const base = 'rounded px-4 py-2 text-sm transition';
  const styles =
    variant === 'ghost'
      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
      : 'bg-black text-white hover:opacity-90';
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}