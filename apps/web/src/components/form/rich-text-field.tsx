import {
  Button,
  cn,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@english-coach/ui";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect, useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface RichTextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  description?: ReactNode;
  disabled?: boolean;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
}

type EditorMode = "visual" | "markdown";
type ToolbarAction =
  | "blockquote"
  | "bold"
  | "bulletList"
  | "clear"
  | "heading2"
  | "heading3"
  | "italic"
  | "link"
  | "orderedList"
  | "redo"
  | "undo";

interface ToolbarButtonConfig {
  action: ToolbarAction;
  label: string;
}

const toolbarButtons: ToolbarButtonConfig[] = [
  { action: "heading2", label: "Heading" },
  { action: "heading3", label: "Subheading" },
  { action: "bold", label: "Bold" },
  { action: "italic", label: "Italic" },
  { action: "bulletList", label: "Bullets" },
  { action: "orderedList", label: "Numbered" },
  { action: "blockquote", label: "Quote" },
  { action: "link", label: "Link" },
  { action: "clear", label: "Clear format" },
  { action: "undo", label: "Undo" },
  { action: "redo", label: "Redo" },
];

interface RichTextEditorControlProps {
  disabled: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

function RichTextEditorControl({ disabled, onBlur, onChange, placeholder, value }: RichTextEditorControlProps) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const editor = useEditor({
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class:
          "coach-rich-text-editor min-h-64 px-4 py-3 text-sm leading-7 text-slate-700 outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol_li]:list-decimal [&_p]:mb-3 [&_ul_li]:list-disc",
      },
    },
    extensions: [
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      StarterKit.configure({ heading: { levels: [2, 3] }, horizontalRule: false }),
      Markdown,
    ],
    immediatelyRender: false,
    onBlur: () => onBlur(),
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getMarkdown()),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.getMarkdown() === value) {
      return;
    }

    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  function runToolbarAction(action: ToolbarAction) {
    if (!editor || disabled) {
      return;
    }

    switch (action) {
      case "heading2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        return;
      case "heading3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        return;
      case "bold":
        editor.chain().focus().toggleBold().run();
        return;
      case "italic":
        editor.chain().focus().toggleItalic().run();
        return;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        return;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        return;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        return;
      case "link": {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL", previousUrl ?? "https://");

        if (url === null) return;
        if (!url.trim()) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }

        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
        return;
      }
      case "clear":
        editor.chain().focus().unsetAllMarks().clearNodes().run();
        return;
      case "undo":
        editor.chain().focus().undo().run();
        return;
      case "redo":
        editor.chain().focus().redo().run();
        return;
    }
  }

  function isToolbarActionActive(action: ToolbarAction) {
    if (!editor) return false;

    switch (action) {
      case "heading2":
        return editor.isActive("heading", { level: 2 });
      case "heading3":
        return editor.isActive("heading", { level: 3 });
      case "bold":
      case "italic":
      case "bulletList":
      case "orderedList":
      case "blockquote":
      case "link":
        return editor.isActive(action);
      case "clear":
      case "undo":
      case "redo":
        return false;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex rounded-lg border border-stone-200 p-1">
          <legend className="sr-only">Editor mode</legend>
          {(["visual", "markdown"] as const).map((editorMode) => (
            <Button
              className={cn(mode === editorMode && "bg-stone-100 text-slate-950")}
              disabled={disabled}
              key={editorMode}
              onClick={() => setMode(editorMode)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {editorMode === "visual" ? "Visual" : "Markdown"}
            </Button>
          ))}
        </fieldset>
        <p className="text-xs text-slate-500">Saved as Markdown</p>
      </div>

      {mode === "visual" ? (
        <div className="flex flex-wrap gap-2">
          {toolbarButtons.map((button) => (
            <Button
              className={cn(isToolbarActionActive(button.action) && "border-stone-300 bg-stone-100 text-slate-950")}
              disabled={disabled || !editor}
              key={button.action}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runToolbarAction(button.action)}
              size="sm"
              type="button"
              variant="outline"
            >
              {button.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "relative rounded-xl border border-stone-200 bg-white shadow-xs transition focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-stone-200",
          disabled && "cursor-not-allowed bg-stone-50 text-stone-400",
        )}
      >
        <FormControl>
          {mode === "visual" ? (
            <EditorContent aria-label={placeholder ?? "Rich text editor"} editor={editor} role="textbox" />
          ) : (
            <textarea
              aria-label="Markdown source"
              className="min-h-72 w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-7 text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-stone-400"
              disabled={disabled}
              onBlur={onBlur}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              spellCheck
              value={value}
            />
          )}
        </FormControl>
      </div>
    </div>
  );
}

export function RichTextField<TFieldValues extends FieldValues>({
  control,
  description,
  disabled = false,
  label,
  name,
  placeholder,
}: RichTextFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const content = typeof field.value === "string" ? field.value : "";

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <RichTextEditorControl
              disabled={disabled}
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder={placeholder}
              value={content}
            />
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
