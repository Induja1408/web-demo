pipeline {
  agent any

  environment {
    // === SonarQube ===
    SONAR_HOST_URL = 'http://18.234.42.66:9000'      // your SonarQube VM URL
    SONARQUBE_CREDS = credentials('sonar-token')     // Jenkins secret text (token)

    // === Nexus (Raw repo) ===
    NEXUS_URL   = 'http://18.234.42.66:8081'         // your Nexus VM URL
    NEXUS_REPO  = 'web-static'                       // create a "raw (hosted)" repo with this name
    NEXUS_CREDS = credentials('nexus-user-pass')     // Jenkins Username/Password credentials
  }

  options {
    timestamps()
    //ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') {
      steps {
        // Jenkins will check out the repo that contains THIS Jenkinsfile
        checkout scm
      }
    }

   stage('Install Node & Test') {
  steps {
    script {
      def ws = pwd()
      sh """
        docker run --rm \
          -v '${ws}/web-demo:/ws' -w /ws \
          node:18-bullseye bash -lc '
            set -e
            corepack enable || true
            npm install
            npm test
          '
      """
    }
  }
}



    stage('SonarQube Scan') {
      steps {
        withEnv([
          "SONAR_SCANNER_OPTS=-Dsonar.host.url=${SONAR_HOST_URL}"
        ]) {
          sh """
            docker run --rm -v "\$PWD":/ws -w /ws \
              -e SONAR_HOST_URL=${SONAR_HOST_URL} \
              -e SONAR_LOGIN=${SONARQUBE_CREDS} \
              sonarsource/sonar-scanner-cli:latest
          """
        }
      }
    }

    stage('Package (zip)') {
      steps {
        sh 'npm run zip'
        archiveArtifacts artifacts: 'dist.zip', fingerprint: true
      }
    }

    stage('Publish to Nexus (raw)') {
      steps {
        sh '''
          curl -sSf -u "${NEXUS_CREDS_USR}:${NEXUS_CREDS_PSW}" \
            --upload-file dist.zip \
            "${NEXUS_URL}/repository/${NEXUS_REPO}/web-demo/${BUILD_NUMBER}/dist.zip"
        '''
      }
    }

    stage('Done') {
      steps {
        echo "✅ Pipeline complete: Test ✓  Sonar ✓  Nexus ✓"
      }
    }
  }

  post {
    success {
      emailext subject: "Jenkins SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
               body: "Build succeeded. Artifact uploaded to Nexus.\n${env.BUILD_URL}",
               to: 'you@example.com',
               recipientProviders: [[$class: 'DevelopersRecipientProvider']]
    }
    failure {
      emailext subject: "Jenkins FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
               body: "Build failed. See logs: ${env.BUILD_URL}",
               to: 'you@example.com',
               recipientProviders: [[$class: 'DevelopersRecipientProvider']]
    }
  }
}

