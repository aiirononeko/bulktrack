import { Link } from "react-router";

type FeatureCardProps = {
  title: string;
  description: string;
  links: Array<{
    to: string;
    label: string;
  }>;
};

export function FeatureCard({ title, description, links }: FeatureCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="p-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {links.map((link) => (
            <div key={`${title}-${link.to}`}>
              <Link to={link.to} className="text-blue-600 hover:underline block">
                {link.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
