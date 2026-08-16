"use client";

const LINKS = [
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
  { label: "Refund policy", href: "#refunds" },
];

export function Footer() {
  return (
    <footer className="sp-footer">
      <div className="sp-shell sp-footer-inner">
        <p className="sp-footer-note">
          Skill Path — practical courses for people building things online.
        </p>

        <ul className="sp-footer-links">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a className="sp-footer-link" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
