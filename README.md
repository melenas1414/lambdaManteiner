# Lambda Maintainer

> AWS Lambda maintenance toolkit for auditing storage usage and cleaning up old function versions.

[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [AWS Permissions](#aws-permissions)
- [Output Examples](#output-examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## 🎯 Overview

Lambda Maintainer is a powerful Node.js tool designed to help you manage AWS Lambda functions at scale. It provides comprehensive auditing capabilities to identify storage-heavy functions and automated cleanup features to maintain optimal storage usage across your AWS account.

### Why Use Lambda Maintainer?

- **Cost Optimization**: Identify and remove unnecessary Lambda versions to reduce storage costs
- **Storage Management**: Get detailed insights into Lambda storage consumption across your entire AWS account
- **Safe Operations**: Dry-run mode allows you to preview changes before applying them
- **Automated Cleanup**: Configurable retention policies to automatically clean up old versions

## ✨ Features

### 🔍 Audit Mode

Comprehensive analysis of your Lambda functions:
- Scan all Lambda functions in your AWS account
- Calculate total storage usage including all versions
- Rank functions by total storage consumption
- Display detailed metrics per function
- Generate account-wide storage reports
- Identify optimization opportunities

### 🧹 Cleanup Mode

Intelligent version management:
- Remove old Lambda function versions automatically
- Configurable version retention (default: keep 5 most recent)
- Dry-run mode for safe testing
- Preserves `$LATEST` and published aliases
- Batch processing for efficiency
- Detailed deletion reports

## 📦 Requirements

- **Node.js**: >= 22.0.0
- **AWS Account**: With appropriate Lambda permissions
- **AWS Credentials**: Configured via one of the following methods:
  - AWS CLI credentials file (`~/.aws/credentials`)
  - Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
  - IAM role (when running on EC2 or Lambda)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/melenas1414/lambdaManteiner.git
cd lambda-mantainer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create your environment configuration file:

```bash
cp .env.example .env
```

Edit `.env` with your AWS settings:

```env
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_access_key (optional if using ~/.aws/credentials)
# AWS_SECRET_ACCESS_KEY=your_secret_key (optional if using ~/.aws/credentials)
```

## 💻 Usage

### Audit Lambda Functions

Scan all Lambda functions and generate a comprehensive storage report:

```bash
npm run audit
```

**What it does:**
- Scans all Lambda functions in the configured AWS region
- Lists each function's versions
- Calculates total storage per function (unit size × number of versions)
- Displays the top 20 functions by total storage usage
- Shows grand total storage consumption

**Output includes:**
- Function name
- Number of versions
- Individual function size (MB)
- Total storage occupied by all versions (MB)
- Account-wide storage total (GB)

### Clean Up Lambda Versions

Remove old versions while keeping the most recent ones.

#### Dry-Run Mode (Recommended First)

Preview what would be deleted without making any changes:

```bash
npm run cleanupDryRun
```

This is a **safe operation** that shows you exactly what would be deleted.

#### Execute Cleanup

Perform the actual cleanup operation:

```bash
npm run cleanup
```

⚠️ **Warning**: This will permanently delete Lambda versions. Always run dry-run mode first!

**Default behavior:**
- Keeps the 5 most recent versions per function
- Preserves `$LATEST` version
- Preserves versions referenced by aliases
- Processes all functions in the account

**Customizing retention:**

Edit `package.json` to change the number of versions to keep:

```json
"cleanup": "node cleanup.js 10 false"  // Keep 10 versions
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `AWS_REGION` | AWS region to operate in | No | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key ID | No* | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | No* | - |
| `AWS_SESSION_TOKEN` | AWS session token (for temporary credentials) | No | - |

\* Required only if not using AWS CLI credentials or IAM roles

### AWS Credentials Setup

#### Option 1: AWS CLI Configuration (Recommended)

```bash
aws configure
```

#### Option 2: Environment Variables

```bash
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_REGION="us-east-1"
```

#### Option 3: .env File

Create a `.env` file in the project root with your credentials.

## 🔐 AWS Permissions

### Minimum Required IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:ListFunctions",
        "lambda:ListVersionsByFunction"
      ],
      "Resource": "*"
    }
  ]
}
```

### For Cleanup Operations (Additional Permissions)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:ListFunctions",
        "lambda:ListVersionsByFunction",
        "lambda:DeleteFunction",
        "lambda:ListAliases"
      ],
      "Resource": "*"
    }
  ]
}
```

### Best Practices

1. **Use least privilege**: Only grant necessary permissions
2. **Separate audit and cleanup**: Use different IAM roles for read-only auditing vs. cleanup operations
3. **Enable CloudTrail**: Monitor all Lambda API calls for compliance
4. **Resource restrictions**: Limit permissions to specific Lambda functions if possible:

```json
{
  "Resource": "arn:aws:lambda:us-east-1:123456789012:function:my-function-*"
}
```

## 📊 Output Examples

### Audit Output

```
🔍 Scanning Lambda functions and their versions... (this may take a while)

📊 TOP 20 LAMBDAS USING MOST STORAGE:
┌─────────┬──────────────────────────────────┬───────────┬──────────────────────┬───────────────────────┐
│ (index) │              Name                │ Versions  │ Unit Size (MB)       │ TOTAL USED (MB)       │
├─────────┼──────────────────────────────────┼───────────┼──────────────────────┼───────────────────────┤
│    0    │ 'production-api-handler'         │    45     │       '12.50'        │       '562.50'        │
│    1    │ 'image-processing-worker'        │    38     │       '25.30'        │       '961.40'        │
│    2    │ 'data-pipeline-transformer'      │    23     │       '8.75'         │       '201.25'        │
│    3    │ 'notification-service'           │    31     │       '5.20'         │       '161.20'        │
│    4    │ 'auth-validator'                 │    19     │       '3.40'         │       '64.60'         │
└─────────┴──────────────────────────────────┴───────────┴──────────────────────┴───────────────────────┘

📦 Total Storage Used in Account: 2.35 GB
```

### Cleanup Dry-Run Output

```
🧪 DRY-RUN MODE - No changes will be made

Analyzing function: production-api-handler
  ✓ Found 45 versions
  ✓ Would keep: 5 most recent versions
  ✓ Would delete: 40 versions
  ✓ Storage freed: ~500 MB

Analyzing function: image-processing-worker
  ✓ Found 38 versions
  ✓ Would keep: 5 most recent versions
  ✓ Would delete: 33 versions
  ✓ Storage freed: ~834.9 MB

💾 Total storage that would be freed: 1.82 GB
```

## 🔧 Troubleshooting

### Common Issues

#### Issue: "Unable to locate credentials"

**Solution**: Ensure AWS credentials are configured properly:
```bash
aws configure
# OR
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

#### Issue: "AccessDeniedException"

**Solution**: Verify your IAM user/role has the required Lambda permissions listed in the [AWS Permissions](#aws-permissions) section.

#### Issue: Script runs slowly

**Cause**: Large number of Lambda functions or versions

**Solution**: This is normal behavior. The script processes all functions sequentially to avoid AWS API rate limits.

#### Issue: Node version error

**Solution**: Ensure you're using Node.js >= 22.0.0:
```bash
node --version  # Should show v22.0.0 or higher
```

### Getting Help

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/melenas1414/lambdaManteiner/issues)
2. Review AWS CloudTrail logs for API errors
3. Enable verbose logging by setting `NODE_DEBUG=lambda`

## 📄 License

This project is licensed under the **GPL-3.0-only** License.

## 👨‍💻 Author

**Santiago Galán Tapias**  
Email: santiagogalan13@gmail.com

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Merge Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 🔗 Links

- **Repository**: [GitHub](https://github.com/melenas1414/lambdaManteiner)
- **Issues**: [Issue Tracker](https://github.com/melenas1414/lambdaManteiner/issues)

---

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
