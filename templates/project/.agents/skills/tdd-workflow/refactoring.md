# Refactor Candidates

Refactor only when tests are green.

Look for:

- duplication that can become a helper, function, or shared fixture
- long methods that hide separate concepts
- shallow modules that should be combined or deepened
- feature envy, where logic belongs with the data it uses
- primitive obsession that should become a value object, schema, or named type
- awkward existing code revealed by the new behavior

Keep tests focused on public behavior while refactoring. Do not add assertions for private helper methods introduced during cleanup.
