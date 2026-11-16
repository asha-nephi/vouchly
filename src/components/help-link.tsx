// "Stuck? Chat with us on WhatsApp". Hidden until HELP_WHATSAPP is set in Render.
export function helpUrl(text = "Hi, I need help setting up my Vouchly shop.") {
  const raw = (process.env.HELP_WHATSAPP ?? "").replace(/\D/g, "");
  if (raw.length < 10) return null;
  const num = raw.startsWith("0") ? `234${raw.slice(1)}` : raw;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export default function HelpLink({ className = "", text }: { className?: string; text?: string }) {
  const url = helpUrl(text);
  if (!url) return null;
  return (
    <p className={`text-center text-sm text-muted ${className}`}>
      Stuck?{" "}
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-accent">
        Chat with us on WhatsApp
      </a>
    </p>
  );
}
