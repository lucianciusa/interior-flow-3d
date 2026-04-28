targetScope = 'resourceGroup'

@description('Region for all resources.')
param location string = resourceGroup().location

@description('Container App name.')
param acaName string

@description('Key Vault name. Globally unique, 3-24 alphanumerics.')
param kvName string

@description('Optional initial container image.')
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

module containerApp 'containerapp.bicep' = {
  name: 'containerApp'
  params: {
    location: location
    acaName: acaName
    image: image
  }
}

module keyVault 'keyvault.bicep' = {
  name: 'keyVault'
  params: {
    location: location
    kvName: kvName
    principalId: containerApp.outputs.acaPrincipalId
  }
}

output acaFqdn string = containerApp.outputs.acaFqdn
output kvUri string = keyVault.outputs.kvUri
