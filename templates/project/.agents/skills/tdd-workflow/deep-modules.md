# Deep Modules

A deep module has a small interface and a substantial implementation behind it.

```text
+-------------------+
|  Small Interface  |
+-------------------+
|                   |
| Deep              |
| Implementation    |
|                   |
+-------------------+
```

A shallow module has a large interface and little implementation. It leaks complexity to callers and creates more test surface than value.

```text
+--------------------------------+
|        Large Interface         |
+--------------------------------+
| Thin pass-through implementation|
+--------------------------------+
```

When designing during TDD, ask:

- can this behavior be exposed through fewer methods?
- can these parameters be simpler?
- can implementation details stay private?
- would callers understand this interface without knowing the internals?

Tests should lock the small public interface, not the deep internal mechanics.
