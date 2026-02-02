import Image from 'next/image';
import Link from 'next/link';

type CollectionItem = {
  id: number;
  name: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
};

type Props = {
  items: CollectionItem[];
};

function getCollectionImage(item: CollectionItem) {
  const path = item.backdrop_path || item.poster_path;
  return path
    ? `https://image.tmdb.org/t/p/original${path}`
    : '/legacy/images/placeholder-hero.jpg';
}

export default function BestCollectionsSection({ items }: Props) {
  if (!items.length) return null;

  return (
    <section aria-label="Mejores colecciones">
      <div className="px-5 py-2 md:px-8 md:py-3">
        <h2 className="text-xl md:text-2xl font-extrabold text-white">
          Con las mejores colecciones, un montón de emociones
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const src = getCollectionImage(item);
            return (
              <Link
                key={item.id}
                href={`/collection/${item.id}`}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border border-white/10
                  bg-black/30
                  shadow-[0_18px_40px_rgba(0,0,0,0.45)]
                  transition
                  hover:-translate-y-[2px]
                  hover:shadow-[0_22px_48px_rgba(0,0,0,0.7)]
                "
              >
                <div className="relative aspect-[16/9]">
                  <Image
                    src={src}
                    alt={item.name}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-x-4 bottom-3">
                    <p className="text-sm md:text-base text-white font-semibold drop-shadow">
                      {item.name}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
