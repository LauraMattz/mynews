import { Heart, Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        Criado por{" "}
        <a
          href="https://www.linkedin.com/in/lauramattosc/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <Linkedin className="h-3.5 w-3.5" />
          Laura Mattos
        </a>
        {" · "}
        <a
          href="https://github.com/LauraMattz/mynews"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </a>
      </p>
    </footer>
  );
}
