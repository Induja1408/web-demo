pipeline {
  agent any

  environment {
    SONAR_HOST_URL = 'http://34.227.80.56:9000'
    SONARQUBE_CREDS = credentials('sonar-token')

    NEXUS_URL   = 'http://34.227.80.56:8081'
    NEXUS_REPO  = 'web-static'
    NEXUS_CREDS = credentials('nexus-deploy')
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
              count=$(echo "$hits" | grep -c . || true)
              if [ "$count" = "1" ]; then echo "$hits"; exit 0; fi
              echo "ERROR: package.json not found and cannot uniquely detect a subfolder." >&2
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
          // IMPORTANT: mount the named volume 'jenkins_home' and cd into the job workspace on that volume
          def workdir = "/jenkins_home/workspace/${env.JOB_NAME}/${env.APP_DIR}"
          sh """
            docker run --rm \
              -v jenkins_home:/jenkins_home -w '${workdir}' \
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
          def workdir = "/jenkins_home/workspace/${env.JOB_NAME}/${env.APP_DIR}"
          sh """
            docker run --rm \
              -e SONAR_HOST_URL='${SONAR_HOST_URL}' \
              -e SONAR_LOGIN='${SONARQUBE_CREDS}' \
              -v jenkins_home:/jenkins_home -w '${workdir}' \
              sonarsource/sonar-scanner-cli:latest
          """
        }
      }
    }

    stage('Package (zip)') {
      steps {
        script {
          def jobRoot = "/jenkins_home/workspace/${env.JOB_NAME}"
          def workdir = "${jobRoot}/${env.APP_DIR}"
          sh """
            docker run --rm -v jenkins_home:/jenkins_home -w '${workdir}' alpine sh -lc '
              set -e
              apk add --no-cache zip
              rm -f "${jobRoot}/dist.zip"
              zip -r "${jobRoot}/dist.zip" . -x "node_modules/*" ".git/*" "coverage/*"
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
