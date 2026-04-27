Analyze Changes: Run git status && git diff HEAD && git status --porcelain to see what files are uncommitted.

Stage Files: Add the untracked and changed files.

Draft Message: Write a technical, descriptive message starting with a capitalized imperative verb. Omit all prefix tags (e.g., no "feat:") and do not include "Co-Authored-By" trailers or metadata.

Style Match: Combine related tasks into a single, high-density sentence using commas and "and" (e.g., "Implement AI formatter, update README, and fix mobile navigation").

Commit: Execute git commit -m "[Generated Message]" ensuring no extra footer text is appended.