import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const roadmapItems: {
  title: string;
  description: string;
  status: {
    text: string;
    type: "complete" | "pending" | "default" | "info";
  };
}[] = [
  {
    title: "Local timeline editing",
    description:
      "Project recovery, clip transforms, audio gain and mute, copy/delete, split, and undo/redo. Original media stays unchanged.",
    status: { text: "Verified locally", type: "complete" },
  },
  {
    title: "Seven basic editing tools",
    description:
      "Shape and image stickers, blur and vignette, crossfade/fade-black/push transitions, manual and imported SRT/VTT captions, six filters, color adjustment, and adjustable freeze frames.",
    status: { text: "Verified locally", type: "complete" },
  },
  {
    title: "Preview and MP4 export",
    description:
      "Shared frame composition and timing, Chinese multiline captions, separate monitoring and output volume, explicit media failures, and reviewed exports. Browser acceptance checks decode the actual MP4 and compare sampled frames and audio.",
    status: { text: "Verified in Chrome", type: "complete" },
  },
  {
    title: "Reviewed UniVA requests",
    description:
      "Complete plans and downloads, version-bound approval, revision and cancellation, stale-checkpoint rejection, and duplicate approval protection. Configuration status is separate from live verification.",
    status: { text: "Offline checks passed", type: "complete" },
  },
  {
    title: "Live provider acceptance",
    description:
      "Image, video and editing providers still require approval of their exact test requests and live verification. The current shot-planning service returned model_not_found. Audio generation and local tracking need additional configuration.",
    status: { text: "Pending configuration / review", type: "pending" },
  },
  {
    title: "Advanced editing",
    description:
      "Automatic speech recognition, keyframes, an asset marketplace, mobile optimization, and multi-user deployment are outside the local basic release.",
    status: { text: "Future", type: "info" },
  },
];

export const metadata: Metadata = {
  title: "Roadmap - UniVA",
  description:
    "Local editor verification, provider setup, and future UniVA features.",
  openGraph: {
    title: "UniVA Local Release Roadmap",
    description:
      "Local editor verification, provider setup, and future UniVA features.",
    type: "website",
    images: [
      {
        url: "/open-graph/roadmap.jpg",
        width: 1200,
        height: 630,
        alt: "UniVA Roadmap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UniVA Local Release Roadmap",
    description:
      "Local editor verification, provider setup, and future UniVA features.",
    images: ["/open-graph/roadmap.jpg"],
  },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-linear-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Link
                href="https://github.com/OpenCut-app/OpenCut"
                target="_blank"
              >
                <Badge variant="secondary" className="gap-2 mb-6">
                  <GithubIcon className="h-3 w-3" />
                  Built on OpenCut
                </Badge>
              </Link>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Roadmap
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                UniVA local basic release (updated October 25, 2026)
              </p>
            </div>
            <div className="space-y-6">
              {roadmapItems.map((item, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start gap-2">
                    <span className="text-lg font-medium text-muted-foreground select-none leading-normal">
                      {index + 1}.
                    </span>
                    <div className="flex-1 pt-[2px]">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{item.title}</h3>
                        <Badge
                          className={cn("shadow-none", {
                            "bg-green-500! text-white":
                              item.status.type === "complete",
                            "bg-yellow-500! text-white":
                              item.status.type === "pending",
                            "bg-blue-500! text-white":
                              item.status.type === "info",
                            "bg-foreground/10! text-accent-foreground":
                              item.status.type === "default",
                          })}
                        >
                          {item.status.text}
                        </Badge>
                      </div>
                      <div className="text-foreground/70 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            a: ({ className, children, ...props }) => (
                              <a
                                className={cn(
                                  "text-primary hover:underline",
                                  className
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {item.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-muted/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Want to Help?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  OpenCut is open source and built by the community. Every
                  contribution, no matter how small, helps us build the best
                  free video editor possible.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/blob/main/.github/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge
                      variant="outline"
                      className="text-sm px-4 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <GithubIcon className="h-4 w-4 mr-2" />
                      Start Contributing
                    </Badge>
                  </Link>
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge
                      variant="outline"
                      className="text-sm px-4 py-2 hover:bg-muted/50 transition-colors"
                    >
                      Report Issues
                    </Badge>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
