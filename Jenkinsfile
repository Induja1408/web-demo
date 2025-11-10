pipeline {
  agent any

  environment {
    // === SonarQube ===
    SONAR_HOST_URL = 'http://34.227.80.56:9000'
    SONARQUBE_CREDS = credentials('sonar-token')

    // === Nexus (Raw repo) ===
    NEXUS_URL   = 'http://34.227.80.56:8081'
    NEXUS_REPO  = 'web-static'
    NEXUS_CREDS = credentials('nexus-deploy')  // exposes NEXUS_CREDS_USR / NEXUS_CREDS_PSW
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Detect app directory') {
      steps {
        script {
          // Find where package.json is. Use '.' if at repo root.
          env.APP_DIR = sh(
            script: '''
              set -e
              if [ -f package.json ]; then echo .; exit 0; fi
              hits=$(find . -maxdepth 2 -mindepth 2 -name package.json -printf "%h\\n" | sed "s|^\\./||")
              count=$(echo "$hits" | grep -c . || true)
              if [ "$count" = "1" ]; then echo "$hits"; exit 0; fi
              echo "ERROR: package.json not found at repo root and unable to uniquely detect a subfolder." >&2
              echo "Candidates:" >&2
              echo "$hits" >&2
              exit 1
            ''',
            returnStdout: true
          ).trim()
          echo "Using APP_DIR='${env.APP_DIR}'"
        }
      }
    }

    stage('Install Node & Test') {
      steps {
        script {
          def ws = pwd()
          sh """
            docker run --rm \
              -v '${ws}:/ws' -w /ws/${APP_DIR} \
              node:18-bullseye bash -lc '
                set -e
                corepack enable || true
                if [ -f package-lock.json ]; then npm ci; else npm install; fi
                npm test
              '
          """
        }
      }
    }

    stage('SonarQube Scan') {
      steps {
        script {
          def ws = pwd()
          sh """
            docker run --rm \
              -e SONAR_HOST_URL='${SONAR_HOST_URL}' \
              -e SONAR_LOGIN='${SONARQUBE_CREDS}' \
              -v '${ws}:/usr/src' -w /usr/src/${APP_DIR} \
              sonarsource/sonar-scanner-cli:latest
          """
        }
      }
    }

    stage('Package (zip)') {
      steps {
        script {
          def ws = pwd()
          sh """
            docker run --rm -v '${ws}:/ws' -w /ws/${APP_DIR} alpine sh -lc '
              set -e
              apk add --no-cache zip
              rm -f /ws/dist.zip
              zip -r /ws/dist.zip . -x "node_modules/*" ".git/*" "coverage/*"
            '
          """
        }
        archiveArtifacts artifacts: 'dist.zip', fingerprint: true
      }
    }

    stage('Publish to Nexus (raw)') {
      steps {
        sh """
          curl -sSf -u "${NEXUS_CREDS_USR}:${NEXUS_CREDS_PSW}" \
            --upload-file dist.zip \
            "${NEXUS_URL}/repository/${NEXUS_REPO}/web-demo/${BUILD_NUMBER}/dist.zip"
        """
      }
    }

    stage('Done') {
      steps { echo "✅ Pipeline complete: Test ✓  Sonar ✓  Nexus ✓" }
    }
  }

  post {
    always { echo "Build finished: ${currentBuild.currentResult}" }
  }
}
