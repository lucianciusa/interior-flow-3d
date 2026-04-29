@description('Azure region for Key Vault.')
param location string = resourceGroup().location

@description('Name of the Key Vault. Globally unique, 3-24 alphanumerics.')
param kvName string

@description('Principal ID (object id) of the Container App managed identity that needs Secrets User access.')
param principalId string

@description('Tenant ID for the Key Vault.')
param tenantId string = subscription().tenantId

@description('HMAC secret used to sign read-only share tokens. Provide via secure deployment param.')
@secure()
param shareTokenSecret string = ''

@description('Supabase service role key — used ONLY by GET /share/{token}.')
@secure()
param supabaseServiceRoleKey string = ''

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

// Built-in role: Key Vault Secrets User
var secretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource secretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, principalId, secretsUserRoleId)
  scope: kv
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleId)
  }
}

resource shareTokenSecretRes 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(shareTokenSecret)) {
  parent: kv
  name: 'SHARE-TOKEN-SECRET'
  properties: {
    value: shareTokenSecret
  }
}

resource supabaseServiceRoleSecretRes 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(supabaseServiceRoleKey)) {
  parent: kv
  name: 'SUPABASE-SERVICE-ROLE-KEY'
  properties: {
    value: supabaseServiceRoleKey
  }
}

output kvName string = kv.name
output kvUri string = kv.properties.vaultUri
output shareTokenSecretUri string = !empty(shareTokenSecret) ? shareTokenSecretRes.properties.secretUri : ''
output supabaseServiceRoleSecretUri string = !empty(supabaseServiceRoleKey) ? supabaseServiceRoleSecretRes.properties.secretUri : ''
