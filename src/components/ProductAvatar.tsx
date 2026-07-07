import React from "react";

// Mapa produto → imagem (mockups em public/products/). Liposkin ainda sem render.
const PRODUCT_IMAGES: Record<string, string> = {
  slimjara: "/products/slimjara.png",
  lipogandha: "/products/lipogandha.png",
  erectus: "/products/erectus.png",
  memoguard: "/products/memoguard.png",
};

export function productImageFor(product: string): string | null {
  return PRODUCT_IMAGES[product.toLowerCase().trim()] ?? null;
}

interface Props {
  product: string;
  size?: number;
}

/** Thumbnail do produto para controle visual. Fallback: inicial em círculo. */
const ProductAvatar: React.FC<Props> = ({ product, size = 22 }) => {
  const src = productImageFor(product);
  if (src) {
    return (
      <img
        className="product-avatar"
        src={src}
        alt={product}
        loading="lazy"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className="product-avatar product-avatar--fallback" style={{ width: size, height: size }}>
      {product.slice(0, 1).toUpperCase()}
    </span>
  );
};

export default ProductAvatar;
