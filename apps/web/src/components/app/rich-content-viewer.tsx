import { cn } from "@english-coach/ui";
import ReactMarkdown from "react-markdown";

interface RichContentViewerProps {
  content: string;
  contentType?: "markdown" | "plain";
  className?: string;
}

export function RichContentViewer({ content, contentType = "markdown", className }: RichContentViewerProps) {
  if (contentType === "plain") {
    return <div className={cn("whitespace-pre-wrap text-sm leading-7 text-slate-700", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "prose prose-stone max-w-none text-sm leading-7 prose-headings:text-slate-950 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700",
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
