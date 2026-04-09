import type { ReactNode } from "react";

export function PagePanel(props: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        {props.eyebrow ? <p className="panel-eyebrow">{props.eyebrow}</p> : null}
        <h2>{props.title}</h2>
        {props.description ? <p className="panel-description">{props.description}</p> : null}
      </div>
      {props.children}
    </section>
  );
}
