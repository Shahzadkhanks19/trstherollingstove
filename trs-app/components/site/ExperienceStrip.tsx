const items = [
  "100% Vegetarian",
  "Freshly Prepared",
  "Dine-in & Takeaway",
  "TRS Rewards",
  "Jodhpur Since 2017",
];

export function ExperienceStrip() {
  return (
    <div className="experience-strip" aria-label="TRS highlights">
      <div className="experience-track">
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
