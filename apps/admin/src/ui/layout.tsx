import type { ReactNode } from "react";

export function Layout(props: {
  sidebar: ReactNode;
  header: ReactNode;
  main: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="console-shell">
      <aside className="console-sidebar">{props.sidebar}</aside>
      <main className="console-main">
        <header className="console-header">{props.header}</header>
        <div className="console-grid">
          <section className="console-workspace">{props.main}</section>
          <aside className="console-inspector">{props.aside}</aside>
        </div>
      </main>
    </div>
  );
}
