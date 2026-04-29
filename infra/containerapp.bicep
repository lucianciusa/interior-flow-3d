@description('Region for the Container Apps environment + app.')
param location string = resourceGroup().location

@description('Container App name.')
param acaName string

@description('Container Apps managed environment name.')
param acaEnvName string = '${acaName}-env'

@description('Container image reference. Defaults to a public hello image so first deploy succeeds before ACR is wired up.')
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container target port.')
param targetPort int = 8000

@description('Key Vault secret URI for SHARE_TOKEN_SECRET (optional).')
param shareTokenSecretUri string = ''

@description('Key Vault secret URI for SUPABASE_SERVICE_ROLE_KEY (optional).')
param supabaseServiceRoleSecretUri string = ''

@description('Public base URL for share links (e.g. https://app.example.com).')
param shareLinkBaseUrl string = ''

resource acaEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: acaEnvName
  location: location
  properties: {}
}

resource aca 'Microsoft.App/containerApps@2024-03-01' = {
  name: acaName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
      }
      secrets: concat(
        empty(shareTokenSecretUri) ? [] : [
          {
            name: 'share-token-secret'
            keyVaultUrl: shareTokenSecretUri
            identity: 'system'
          }
        ],
        empty(supabaseServiceRoleSecretUri) ? [] : [
          {
            name: 'supabase-service-role-key'
            keyVaultUrl: supabaseServiceRoleSecretUri
            identity: 'system'
          }
        ]
      )
    }
    template: {
      containers: [
        {
          name: 'api'
          image: image
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: concat(
            empty(shareTokenSecretUri) ? [] : [
              {
                name: 'SHARE_TOKEN_SECRET'
                secretRef: 'share-token-secret'
              }
            ],
            empty(supabaseServiceRoleSecretUri) ? [] : [
              {
                name: 'SUPABASE_SERVICE_ROLE_KEY'
                secretRef: 'supabase-service-role-key'
              }
            ],
            empty(shareLinkBaseUrl) ? [] : [
              {
                name: 'SHARE_LINK_BASE_URL'
                value: shareLinkBaseUrl
              }
            ]
          )
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output acaName string = aca.name
output acaFqdn string = aca.properties.configuration.ingress.fqdn
output acaPrincipalId string = aca.identity.principalId
