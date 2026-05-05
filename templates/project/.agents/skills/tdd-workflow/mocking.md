# Mocking

Mock at system boundaries only.

Good mock targets:

- external APIs
- payment, email, analytics, or notification providers
- time and randomness
- file system or network access when using the real boundary is too slow or unsafe
- databases only when the project lacks a practical test database

Do not mock:

- your own modules
- internal collaborators
- classes or functions controlled by the repo
- behavior that can be exercised through a real in-process path

## Design Boundaries For Mockability

Accept dependencies instead of creating them internally.

```typescript
// Easier to test.
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Harder to test.
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

Prefer specific SDK-style boundary functions over a generic fetch wrapper with conditional behavior.

```typescript
// Good: each function returns one specific shape.
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch("/orders", { method: "POST", body: data })
};

// Bad: tests need conditional logic inside the mock.
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options)
};
```

Boundary mocks should make test setup simpler, not hide behavior.
