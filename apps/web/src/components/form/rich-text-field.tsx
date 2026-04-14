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
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface RichTextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  description?: ReactNode;
  disabled?: boolean;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
}

interface ToolbarButtonConfig {
  action: "bold" | "bulletList" | "italic";
  label: string;
}

const toolbarButtons: ToolbarButtonConfig[] = [
  { action: "bold", label: "Bold" },
  { action: "italic", label: "Italic" },
  { action: "bulletList", label: "Bullets" },
];

interface RichTextEditorControlProps {
  disabled: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

function RichTextEditorControl({ disabled, onBlur, onChange, placeholder, value }: RichTextEditorControlProps) {
  const editor = useEditor({
    content: value,
    editorProps: {
      attributes: {
        class:
          "coach-rich-text-editor min-h-64 px-4 py-3 text-sm leading-7 text-slate-700 outline-none [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3",
      },
    },
    extensions: [
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
      }),
    ],
    immediatelyRender: false,
    onBlur: () => onBlur(),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentHtml = editor.getHTML();

    if (currentHtml === value) {
      return;
    }

    editor.commands.setContent(value, {
      emitUpdate: false,
    });
  }, [editor, value]);

  function runToolbarAction(action: ToolbarButtonConfig["action"]) {
    if (!editor || disabled) {
      return;
    }

    switch (action) {
      case "bold":
        editor.chain().focus().toggleBold().run();
        return;
      case "italic":
        editor.chain().focus().toggleItalic().run();
        return;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        return;
    }
  }

  function isToolbarActionActive(action: ToolbarButtonConfig["action"]) {
    if (!editor) {
      return false;
    }

    switch (action) {
      case "bold":
        return editor.isActive("bold");
      case "italic":
        return editor.isActive("italic");
      case "bulletList":
        return editor.isActive("bulletList");
    }
  }

  return (
    <div className="space-y-3">
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

      <div
        className={cn(
          "relative rounded-xl border border-stone-200 bg-white shadow-xs transition focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-stone-200",
          disabled && "cursor-not-allowed bg-stone-50 text-stone-400",
        )}
      >
        <FormControl>
          <EditorContent aria-label={placeholder ?? "Rich text editor"} editor={editor} role="textbox" />
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
