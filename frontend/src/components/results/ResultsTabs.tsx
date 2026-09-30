import { useEffect, useState } from 'react';

export interface ResultsTab {
  id: string;
  label: string;
  /** Rendered after the label — the correction count, for instance. */
  badge?: number;
}

/**
 * Index tabs along the top of the marked-up sections, drawn like the tabs on a
 * divider in a ring binder: the current one joins the sheet below by breaking
 * the rule it sits on.
 *
 * They are anchor links, not a tab control — every section stays on the page
 * and stays scrollable. Hiding four of five sections behind a real tab widget
 * would make "what did I get wrong overall" a four-click question.
 */
export default function ResultsTabs({ tabs }: { tabs: ResultsTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);

  const tabKey = tabs.map((tab) => tab.id).join(',');

  useEffect(() => {
    const TRIGGER = 140;
    let frame = 0;

    function update() {
      frame = 0;
      const tops = tabKey.split(',').map((id) => ({
        id,
        top: document.getElementById(id)?.getBoundingClientRect().top ?? Infinity,
      }));
      const passed = tops.filter((section) => section.top <= TRIGGER);
      setActiveId(passed.length > 0 ? passed[passed.length - 1].id : tops[0]?.id);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [tabKey]);

  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Results sections"
      className="-mb-[1.5px] flex flex-wrap gap-2 border-b-[1.5px] border-line-strong text-sm font-650"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`rounded-t-[10px] border-[1.5px] border-b-0 px-4 pt-2.5 no-underline ${
              isActive
                ? 'relative z-10 -mb-[1.5px] border-line-strong bg-white pb-[11.5px] text-ink'
                : 'border-line-dash bg-[#F1F4F7] pb-2.5 text-ink-2 hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="mono ml-1.5 text-wrong-text">{tab.badge}</span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
