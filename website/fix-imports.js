const fs = require('fs');
const path = require('path');

const fixes = [
  ['src/components/code/TerminalWindow.tsx', "import React, { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';"],
  ['src/components/layout/DocsSidebar.tsx', "import React from 'react';", ""],
  ['src/components/layout/Footer.tsx', "import React from 'react';", ""],
  ['src/components/layout/Header.tsx', "import React, { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';"],
  ['src/components/layout/Layout.tsx', "import React from 'react';", ""],
  ['src/pages/APIPage.tsx', "import React from 'react';", ""],
  ['src/pages/CLIPage.tsx', "import React from 'react';", ""],
  ['src/pages/DocsPage.tsx', "import React from 'react';", ""],
  ['src/pages/ExamplesPage.tsx', "import React from 'react';", ""],
  ['src/pages/FixesPage.tsx', "import React from 'react';", ""],
  ['src/pages/HomePage.tsx', "import React from 'react';", ""],
];

for (const [file, search, replace] of fixes) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(filePath, content);
  console.log('Fixed:', file);
}
