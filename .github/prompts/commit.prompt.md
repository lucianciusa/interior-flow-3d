Analyze Changes: Run git status && git diff HEAD && git status --porcelain to see what files are uncommitted.

Stage Files: Add the untracked and changed files.

Draft Message (Subject): Write a technical, high-density summary starting with a capitalized imperative verb. Omit all prefix tags (no "feat:") and "Co-Authored-By" metadata. Combine related tasks with commas and "and".

Draft Description (Body): Create a bulleted list providing a deeper technical breakdown of the changes (e.g., specific logic updates, refactored functions, or dependency changes).

Commit: Execute the commit using the following format to ensure the description is properly separated:
git commit -m "[Subject]" -m "[Bullet Point 1]" -m "[Bullet Point 2]"
(Note: Ensure no extra footer text or AI attribution is appended.)