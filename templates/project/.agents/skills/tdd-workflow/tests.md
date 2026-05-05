# Good And Bad Tests

## Good Tests

Good tests verify behavior through public interfaces.

```typescript
test("user can checkout with a valid cart", async () => {
  const cart = createCart();
  cart.add(product);

  const result = await checkout(cart, paymentMethod);

  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- tests behavior users or callers care about
- uses the public API only
- survives internal refactors
- describes what happens, not how it happens
- keeps each test focused on one behavior

## Bad Tests

Bad tests couple themselves to internal structure.

```typescript
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);

  await checkout(cart, payment);

  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- mocking internal collaborators
- testing private methods
- asserting on call counts or internal order
- breaking when implementation changes but behavior does not
- naming tests after implementation steps

## Verify Through The Interface

Avoid using a second private path to verify state.

```typescript
// Bad: bypasses the interface being tested.
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// Good: verifies the behavior through public application APIs.
test("createUser makes the user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```
