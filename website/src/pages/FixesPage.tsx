import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { DocsSidebar, type SidebarSection } from '@/components/layout';
import { IDEWindow } from '@/components/code';
import { Wrench, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const sidebarSections: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'How It Works', href: '#how-it-works' },
      { name: 'Fix Types', href: '#fix-types' },
    ],
  },
  {
    title: 'Memoization',
    items: [
      { name: 'React.memo', href: '#react-memo', badge: 'High' },
      { name: 'useMemo', href: '#use-memo', badge: 'High' },
      { name: 'useCallback', href: '#use-callback', badge: 'High' },
    ],
  },
  {
    title: 'State',
    items: [
      { name: 'State Splitting', href: '#state-split' },
      { name: 'Context Splitting', href: '#context-split' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { name: 'Virtualization', href: '#virtualization', badge: 'High' },
      { name: 'Debouncing', href: '#debounce' },
      { name: 'Lazy Loading', href: '#lazy' },
      { name: 'Key Fix', href: '#key-fix', badge: 'Critical' },
    ],
  },
];

const fixTypes = [
  { name: 'memo', desc: 'Wrap component with React.memo', impact: 'High', color: 'healthy' },
  { name: 'useMemo', desc: 'Memoize expensive computations', impact: 'High', color: 'healthy' },
  { name: 'useCallback', desc: 'Memoize callback functions', impact: 'High', color: 'healthy' },
  { name: 'state-split', desc: 'Split large state objects', impact: 'Medium', color: 'warning' },
  { name: 'context-split', desc: 'Split context by update frequency', impact: 'Medium', color: 'warning' },
  { name: 'virtualization', desc: 'Virtualize long lists', impact: 'High', color: 'healthy' },
  { name: 'debounce', desc: 'Debounce rapid state updates', impact: 'Medium', color: 'warning' },
  { name: 'lazy', desc: 'Lazy load heavy components', impact: 'Medium', color: 'warning' },
  { name: 'key-fix', desc: 'Fix inefficient list keys', impact: 'Critical', color: 'critical' },
];

const codeExamples = {
  memoBefore: `function ProductCard({ product, onAddToCart }) {
  // Re-renders on EVERY parent render
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>\${product.price}</p>
      <button onClick={() => onAddToCart(product)}>
        Add to Cart
      </button>
    </div>
  );
}`,
  memoAfter: `import { memo } from 'react';

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart
}) {
  // Only re-renders when props change
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>\${product.price}</p>
      <button onClick={() => onAddToCart(product)}>
        Add to Cart
      </button>
    </div>
  );
});`,
  useMemoBefore: `function ProductList({ products, filter }) {
  // Runs on EVERY render
  const filteredProducts = products
    .filter(p => p.category === filter)
    .sort((a, b) => a.price - b.price);

  return (
    <ul>
      {filteredProducts.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}`,
  useMemoAfter: `import { useMemo } from 'react';

function ProductList({ products, filter }) {
  // Only runs when products or filter changes
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.category === filter)
      .sort((a, b) => a.price - b.price);
  }, [products, filter]);

  return (
    <ul>
      {filteredProducts.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}`,
  useCallbackBefore: `function ShoppingCart({ items }) {
  const [cart, setCart] = useState([]);

  // New function on EVERY render
  const handleAddToCart = (item) => {
    setCart([...cart, item]);
  };

  return (
    <ProductList
      items={items}
      onAddToCart={handleAddToCart}
    />
  );
}`,
  useCallbackAfter: `import { useState, useCallback } from 'react';

function ShoppingCart({ items }) {
  const [cart, setCart] = useState([]);

  // Same function reference
  const handleAddToCart = useCallback((item) => {
    setCart(prev => [...prev, item]);
  }, []);

  return (
    <ProductList
      items={items}
      onAddToCart={handleAddToCart}
    />
  );
}`,
  virtualizationBefore: `function ProductList({ products }) {
  // Renders ALL 10,000 items!
  return (
    <div className="list">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}`,
  virtualizationAfter: `import { FixedSizeList } from 'react-window';

function ProductList({ products }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  // Only renders ~10 visible items!
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={products.length}
      itemSize={100}
    >
      {Row}
    </FixedSizeList>
  );
}`,
  keyBefore: `function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        // Using index as key - BAD!
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}`,
  keyAfter: `function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo) => (
        // Using stable unique ID - GOOD!
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}`,
};

interface FixSectionProps {
  id: string;
  title: string;
  badge: 'High' | 'Medium' | 'Critical';
  description: string;
  when: string[];
  beforeCode: string;
  afterCode: string;
  note?: { type: 'info' | 'warning' | 'error'; text: string };
}

function FixSection({ id, title, badge, description, when, beforeCode, afterCode, note }: FixSectionProps) {
  const badgeVariant = badge === 'Critical' ? 'critical' : badge === 'High' ? 'healthy' : 'warning';

  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
        <Badge variant={badgeVariant}>{badge} Impact</Badge>
        {title}
      </h2>
      <p className="text-muted-foreground mb-6">{description}</p>

      <div className="p-4 rounded-lg bg-card border border-border mb-6">
        <h4 className="text-sm font-semibold mb-2">When ReactCheck suggests this:</h4>
        <ul className="space-y-1">
          {when.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="critical">Before</Badge>
          </div>
          <IDEWindow
            files={[{ name: 'Component.tsx', language: 'typescript', code: beforeCode }]}
            title="VS Code"
            highlightLines={[1, 2]}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="healthy">After</Badge>
          </div>
          <IDEWindow
            files={[{ name: 'Component.tsx', language: 'typescript', code: afterCode }]}
            title="VS Code"
            highlightLines={[1, 3]}
          />
        </div>
      </div>

      {note && (
        <div className={`mt-4 p-4 rounded-lg border ${
          note.type === 'error' ? 'bg-critical/10 border-critical/20' :
          note.type === 'warning' ? 'bg-warning/10 border-warning/20' :
          'bg-primary/10 border-primary/20'
        }`}>
          <p className={`text-sm ${
            note.type === 'error' ? 'text-critical' :
            note.type === 'warning' ? 'text-warning' :
            'text-primary'
          }`}>
            <strong>{note.type === 'error' ? 'Warning:' : note.type === 'warning' ? 'Note:' : 'Tip:'}</strong> {note.text}
          </p>
        </div>
      )}
    </section>
  );
}

export function FixesPage() {
  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          <DocsSidebar sections={sidebarSections} className="hidden lg:block" />

          <div className="flex-1 min-w-0 max-w-4xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                <Wrench className="w-3 h-3 mr-1" />
                Fix Suggestions
              </Badge>
              <h1 className="text-4xl font-bold mb-4">Performance Fixes</h1>
              <p className="text-xl text-muted-foreground">
                ReactCheck analyzes render patterns and provides actionable fix suggestions with ready-to-use code.
              </p>
            </motion.div>

            {/* How It Works */}
            <section id="how-it-works" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">How Detection Works</h2>
              <div className="p-6 rounded-lg bg-card border border-border">
                <ol className="space-y-3">
                  {[
                    'ReactCheck monitors component renders in real-time, tracking frequency and patterns.',
                    'It analyzes render causes: prop changes, state updates, context changes, and parent re-renders.',
                    'Based on patterns detected, it suggests the most appropriate optimization technique.',
                    'Each suggestion includes a confidence score and expected impact level.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Fix Types Overview */}
            <section id="fix-types" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Fix Types Overview</h2>
              <div className="space-y-2">
                {fixTypes.map((fix) => (
                  <div key={fix.name} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full bg-${fix.color}`} />
                      <code className="text-primary font-mono">{fix.name}</code>
                      <span className="text-muted-foreground">{fix.desc}</span>
                    </div>
                    <Badge variant={fix.color === 'healthy' ? 'healthy' : fix.color === 'warning' ? 'warning' : 'critical'}>
                      {fix.impact}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            {/* React.memo */}
            <FixSection
              id="react-memo"
              title="React.memo"
              badge="High"
              description="Prevents re-renders when props haven't changed. Most effective for components that receive stable props but have parents that re-render frequently."
              when={[
                'Component re-renders frequently with identical props',
                'Parent component has frequent state updates',
                'Component is expensive to render',
              ]}
              beforeCode={codeExamples.memoBefore}
              afterCode={codeExamples.memoAfter}
              note={{
                type: 'warning',
                text: 'React.memo only does a shallow comparison. For objects/arrays, ensure they\'re memoized or use a custom comparison function.',
              }}
            />

            {/* useMemo */}
            <FixSection
              id="use-memo"
              title="useMemo"
              badge="High"
              description="Memoizes expensive computations so they only re-run when dependencies change. Critical for data transformations, filtering, and sorting."
              when={[
                'Component performs expensive calculations on each render',
                'Same computation runs multiple times with same inputs',
                'Derived data is being recalculated unnecessarily',
              ]}
              beforeCode={codeExamples.useMemoBefore}
              afterCode={codeExamples.useMemoAfter}
            />

            {/* useCallback */}
            <FixSection
              id="use-callback"
              title="useCallback"
              badge="High"
              description="Memoizes callback functions to prevent child components from re-rendering when callbacks are passed as props."
              when={[
                'Callback functions passed to memoized children',
                'Functions used in useEffect dependencies',
                'Event handlers causing child re-renders',
              ]}
              beforeCode={codeExamples.useCallbackBefore}
              afterCode={codeExamples.useCallbackAfter}
              note={{
                type: 'info',
                text: 'Use the functional update form setCart(prev => ...) to avoid adding state to dependencies.',
              }}
            />

            {/* Virtualization */}
            <FixSection
              id="virtualization"
              title="Virtualization"
              badge="High"
              description="Only render visible items in long lists. Essential for lists with hundreds or thousands of items."
              when={[
                'List with more than 50-100 items',
                'Scroll performance is poor',
                'Initial render time is slow',
              ]}
              beforeCode={codeExamples.virtualizationBefore}
              afterCode={codeExamples.virtualizationAfter}
              note={{
                type: 'info',
                text: 'Recommended libraries: react-window (lightweight) or react-virtualized (full-featured).',
              }}
            />

            {/* Key Fix */}
            <FixSection
              id="key-fix"
              title="Key Optimization"
              badge="Critical"
              description="Using array indices as keys causes unnecessary re-renders and can lead to bugs when list items are reordered, added, or removed."
              when={[
                'Array index used as key prop',
                'List items frequently reorder',
                'Items added/removed from middle of list',
              ]}
              beforeCode={codeExamples.keyBefore}
              afterCode={codeExamples.keyAfter}
              note={{
                type: 'error',
                text: 'If your data doesn\'t have unique IDs, generate them when the data is created (not during render).',
              }}
            />

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-border">
              <Link to="/api" className="text-primary hover:underline flex items-center gap-1">
                ← API Reference
              </Link>
              <Link to="/examples" className="text-primary hover:underline flex items-center gap-1">
                Examples <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
