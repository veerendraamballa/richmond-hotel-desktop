# Contributing to Richmond Hotel Management System

Thank you for considering contributing to Richmond Hotel Manager! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Release Process](#release-process)

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive criticism
- Respect differing viewpoints
- Show empathy towards other contributors

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/richmond-hotel-desktop.git
   cd richmond-hotel-desktop
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/richmond-hotel-desktop.git
   ```

### Install Dependencies

```bash
npm install
```

### Run Development Build

```bash
npm start
```

## 🔄 Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent production fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

**Examples:**
- `feature/add-email-notifications`
- `bugfix/fix-payment-calculation`
- `docs/update-installation-guide`

### Creating a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the feature branch
2. Test your changes thoroughly
3. Ensure code follows our standards
4. Update documentation if needed

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

### Examples

```bash
# Feature commit
git commit -m "feat(bookings): add email confirmation on booking creation"

# Bug fix commit
git commit -m "fix(payments): correct calculation for partial payments"

# Documentation
git commit -m "docs(readme): update installation instructions for Windows"

# Breaking change
git commit -m "feat(database): migrate to PostgreSQL

BREAKING CHANGE: SQLite is no longer supported. See MIGRATION.md for upgrade guide."
```

### Commit Message Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be 72 characters or less
- Reference issues and PRs in the footer

## 🔍 Pull Request Process

### Before Submitting

1. **Update from main:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Test your changes:**
   ```bash
   npm start  # Test in development
   npm run build  # Test production build
   ```

3. **Check code quality:**
   ```bash
   npm run lint  # If linter is configured
   ```

### Creating a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to GitHub and create a Pull Request

3. Fill out the PR template completely

4. Link related issues using keywords:
   - `Fixes #123`
   - `Closes #456`
   - `Resolves #789`

### PR Title Format

```
<type>(<scope>): <description>
```

**Examples:**
- `feat(billing): add support for multiple payment methods`
- `fix(rooms): resolve status update race condition`
- `docs: update contribution guidelines`

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Tested on Windows 10/11
- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] Manual testing completed
- [ ] Added automated tests

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in complex areas
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Fixes #(issue number)
```

### Review Process

- At least one approval required for merge
- All CI checks must pass
- No merge conflicts
- Code review feedback must be addressed

## 💻 Coding Standards

### JavaScript Style Guide

```javascript
// Use const/let, not var
const MAX_ROOMS = 1000;
let currentBooking = null;

// Use arrow functions for callbacks
rooms.filter(room => room.status === 'available');

// Use template literals
const message = `Room ${roomNumber} is now ${status}`;

// Use async/await for asynchronous code
async function fetchBookings() {
    try {
        const bookings = await window.electronAPI.getBookings();
        return bookings;
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        throw error;
    }
}

// Document functions with JSDoc
/**
 * Creates a new booking in the system
 * @param {Object} bookingData - The booking information
 * @param {number} bookingData.roomId - ID of the room
 * @param {string} bookingData.guestName - Name of the guest
 * @returns {Promise<Object>} The created booking
 */
async function createBooking(bookingData) {
    // Implementation
}
```

### File Organization

```
src/
├── main/              # Main process code
│   ├── database/      # Database operations
│   ├── ipc/           # IPC handlers
│   └── utils/         # Utility functions
├── renderer/          # Renderer process code
│   ├── components/    # UI components
│   ├── styles/        # CSS files
│   └── utils/         # Helper functions
└── shared/            # Shared constants/types
```

### Error Handling

```javascript
// Always handle errors gracefully
try {
    const result = await riskyOperation();
    showNotification('Success!', 'success');
} catch (error) {
    console.error('Operation failed:', error);
    showNotification('An error occurred. Please try again.', 'error');
}
```

### Database Queries

```javascript
// Use prepared statements
const stmt = db.prepare('SELECT * FROM rooms WHERE status = ?');
const rooms = stmt.all('available');

// Never concatenate user input
// ❌ BAD
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// ✅ GOOD
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(userEmail);
```

## 🧪 Testing Guidelines

### Manual Testing Checklist

- [ ] Test on target operating system
- [ ] Test with fresh installation
- [ ] Test with existing data
- [ ] Test edge cases (empty data, max capacity, etc.)
- [ ] Test error scenarios (network loss, disk full, etc.)

### Automated Testing (When Implemented)

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- booking.test.js
```

### Writing Tests

```javascript
describe('Booking Creation', () => {
    it('should create booking with valid data', async () => {
        const bookingData = {
            roomId: 1,
            guestName: 'John Doe',
            checkIn: '2024-06-01',
            checkOut: '2024-06-05'
        };
        
        const result = await createBooking(bookingData);
        
        expect(result.success).toBe(true);
        expect(result.booking).toHaveProperty('id');
    });

    it('should reject booking with invalid dates', async () => {
        const bookingData = {
            roomId: 1,
            checkIn: '2024-06-05',
            checkOut: '2024-06-01'  // Before check-in
        };
        
        await expect(createBooking(bookingData)).rejects.toThrow();
    });
});
```

## 📦 Release Process

### Version Numbers

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (v2.0.0)
- **MINOR**: New features (v1.1.0)
- **PATCH**: Bug fixes (v1.0.1)

### Creating a Release

1. **Update version in package.json:**
   ```bash
   npm version patch  # For bug fixes
   npm version minor  # For new features
   npm version major  # For breaking changes
   ```

2. **Update CHANGELOG.md:**
   ```markdown
   ## [1.1.0] - 2024-06-15
   
   ### Added
   - Email notifications for bookings
   - Export to Excel functionality
   
   ### Fixed
   - Payment calculation rounding error
   - Room status not updating after checkout
   ```

3. **Create and push tag:**
   ```bash
   git push origin main --tags
   ```

4. **GitHub Actions will automatically:**
   - Build for all platforms
   - Create GitHub Release
   - Upload installers

## 🆘 Getting Help

- 📖 Check the [README.md](README.md)
- 🔍 Search [existing issues](https://github.com/OWNER/richmond-hotel-desktop/issues)
- 💬 Ask in [Discussions](https://github.com/OWNER/richmond-hotel-desktop/discussions)
- 📧 Email: support@richmondhotel.com

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Richmond Hotel Manager!** 🎉
