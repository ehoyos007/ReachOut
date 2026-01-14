import Link from "next/link";
import { GitBranch, Users, FileText, Settings, LucideIcon } from "lucide-react";

interface Feature {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  disabled?: boolean;
}

export default function Home() {
  const features: Feature[] = [
    {
      href: "/workflows",
      icon: GitBranch,
      title: "Workflows",
      description: "Create visual automation sequences with drag-and-drop",
    },
    {
      href: "/contacts",
      icon: Users,
      title: "Contacts",
      description: "Manage your contacts and organize them with tags",
    },
    {
      href: "/templates",
      icon: FileText,
      title: "Templates",
      description: "Create reusable SMS and email message templates",
    },
    {
      href: "/settings",
      icon: Settings,
      title: "Settings",
      description: "Configure Twilio, SendGrid, and other integrations",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">ReachOut</h1>
            <nav className="flex items-center gap-6">
              <Link
                href="/workflows"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Workflows
              </Link>
              <Link
                href="/contacts"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Contacts
              </Link>
              <Link
                href="/templates"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Templates
              </Link>
              <Link
                href="/settings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-gray-900">
            Automated Outreach Made Simple
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Build and run automated SMS and email outreach campaigns with visual
            drag-and-drop workflows. Personalize at scale.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;

            const cardContent = (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {feature.title}
                    {feature.disabled && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        Coming Soon
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            );

            if (feature.disabled) {
              return (
                <div
                  key={feature.title}
                  className="group block p-6 bg-white rounded-lg border opacity-50 cursor-not-allowed"
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="group block p-6 bg-white rounded-lg border hover:border-gray-300 hover:shadow-md transition-all"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
