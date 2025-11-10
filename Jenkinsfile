pipeline {
  agent any

  environment {
    SONAR_HOST_URL = 'http://34.227.80.56:9000'
    SONARQUBE_CREDS = credentials('sonar-token')

    NEXUS_URL   = 'http://34.227.80.56:8081'
    NEXUS_REPO  = 'web-static'
    NEXUS_CREDS = credentials('nexus-deploy') // exposes NEXUS_CREDS_USR / NEXUS_CREDS_PSW
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Detect app directory') {
      steps {
        script {
          env.APP_DIR = sh(
            script: '''
              set -e
              if [ -f package.json ]; then echo .; exit 0; fi
              hits=$(find . -maxdepth 2 -mindepth 2 -name package.json -printf "%h\\n" | sed "s|^\\./||")
              cnt=$(echo "$hits" | grep -c . || true)
              if [ "$cnt" = "1" ]; then echo "$hits"; exit 0; fi
              echo "ERROR: package.json not found at repo root and cannot uniquely detect a subfolder." >&2
              echo "$hits" >&2
              exit 1
            ''',
            returnStdout: true
          ).trim()
          echo "APP_DIR='${env.APP_DIR}'"
        }
      }
    }

    stage('Install Node & Test') {
      steps {
        script {
          def ws = pwd() // /var/jenkins_home/workspace/CI-CD-Automation
          def volPath = ws.replace('/var/jenkins_home','/jenkins_home') + (env.APP_DIR == '.' ? '' : "/${env.APP_DIR}")
          sh """
            docker run --rm \
              -v jenkins_home:/jenkins_home -w '${volPath}' \
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
          def volPath = ws.replace('/var/jenkins_home','/jenkins_home') + (env.APP_DIR == '.' ? '' : "/${env.APP_DIR}")
          sh """
            docker run --rm \
              -e SONAR_HOST_URL='${SONAR_HOST_URL}' \
              -e SONAR_LOGIN='${SONARQUBE_CREDS}' \
              -v jenkins_home:/jenkins_home -w '${volPath}' \
              sonarsource/sonar-scanner-cli:latest
          """
        }
      }
    }

    stage('Package (zip)') {
      steps {
        script {
          def ws = pwd()
          def jobRootVol = ws.replace('/var/jenkins_home','/jenkins_home')
          def volPath = jobRootVol + (env.APP_DIR == '.' ? '' : "/${env.APP_DIR}")
          sh """
            docker run --rm -v jenkins_home:/jenkins_home -w '${volPath}' alpine sh -lc '
              set -e
              apk add --no-cache zip
              rm -f "${jobRootVol}/dist.zip"
              zip -r "${jobRootVol}/dist.zip" . -x "node_modules/*" ".git/*" "coverage/*"
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

    stage('Done') { steps { echo "✅ Pipeline complete: Test ✓  Sonar ✓  Nexus ✓" } }
  }

  post { always { echo "Build finished: ${currentBuild.currentResult}" } }
}
