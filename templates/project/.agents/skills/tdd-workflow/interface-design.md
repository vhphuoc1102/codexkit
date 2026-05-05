# Interface Design For Testability

Good interfaces make behavior tests natural.

## Accept Dependencies

Pass boundary dependencies in. Do not construct them deep inside behavior code.

```typescript
function processOrder(order, paymentGateway) {
  return paymentGateway.charge(order.total);
}
```

## Return Results

Prefer returning explicit results over mutating hidden state.

```typescript
function calculateDiscount(cart): Discount {
  return computeDiscount(cart.items);
}
```

## Keep Surface Area Small

Small interfaces need fewer tests and simpler setup.

Use fewer methods, fewer parameters, and plain domain vocabulary. Push complexity behind the interface instead of exposing helper steps to callers.

## Make Invalid States Hard To Express

When the language and project style support it, prefer typed values, value objects, enums, schemas, or constructors that prevent invalid combinations before runtime.
