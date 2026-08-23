const items = [
  "100% Vegetarian",
  "Handmade Pizzas",
  "Pastas",
  "Loaded Fries",
  "Brownies",
  "Mocktails",
  "Chur-Chur Naan",
];

export function LogoMarquee() {
  return (
    <div className="brand-marquee" aria-label="Menu highlights">
      <div className="marquee-track">
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`}>
            {item}
            <i aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}
