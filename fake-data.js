const ewr1 = {
        flight1Start: new Date('2022-09-03T18:00:00Z'),
        flight1Number: '720',
        flight1End: new Date('2022-09-04T00:10:00Z'),
        destination: 'EWR',
        flight2Start: new Date('2022-09-05T00:40:00Z'),
        flight2Number: '721',
        flight2End: new Date('2022-09-05T08:00:00Z')
  };

  const lax1 = {
        flight1Start: new Date('2022-09-08T15:00:00Z'),
        flight1Number: '700',
        flight1End: new Date('2022-09-09T01:10:00Z'),
        destination: 'LAX',
        flight2Start: new Date('2022-09-10T00:40:00Z'),
        flight2Number: '701',
        flight2End: new Date('2022-09-10T11:30:00Z')
  };

  const run1 = {
        flight1Start: new Date('2022-09-02T16:25:00Z'),
        flight1Number: '700',
        flight1End: new Date('2022-09-03T05:30:00Z'),
        destination: 'RUN',
        flight2Start: new Date('2022-09-05T18:10:00Z'),
        flight2Number: '701',
        flight2End: new Date('2022-09-06T06:00:00Z')
  };

  const sfo1 = {
        flight1Start: new Date('2022-09-05T16:25:00Z'),
        flight1Number: '750',
        flight1End: new Date('2022-09-06T05:30:00Z'),
        destination: 'SFO',
        flight2Start: new Date('2022-09-09T19:10:00Z'),
        flight2Number: '751',
        flight2End: new Date('2022-09-10T06:00:00Z')
  };

  const sfoppt1 = {
        flight1Start: new Date('2022-09-02T15:00:00Z'),
        flight1Number: '750',
        flight1End: new Date('2022-09-03T04:20:00Z'),
        destination1: 'SFO',
        flight2Start: new Date('2022-09-06T06:20:00Z'),
        flight2Number: '770',
        flight2End: new Date('2022-09-06T15:15:00Z'),
        destination2: 'PPT',
        flight3Start: new Date('2022-09-08T17:00:00Z'),
        flight3Number: '771',
        flight3End: new Date('2022-09-09T01:35:00Z'),
        destination3: 'SFO',
        flight4Start: new Date('2022-09-11T03:30:00Z'),
        flight4Number: '751',
        flight4End: new Date('2022-09-11T14:20:00Z'),
  };

const emptyRoster = {
  fullName: 'Jake EMPTY',
  rotations: []
}

const lanaRoster = {
  fullName: 'Lana ROSE',
  rotations: [run1, lax1]
}

const myRoster = {
    fullName: 'Oliver STONE',
    rotations: [run1]
  };

const rosters = [
    {
      fullName: 'John DOE',
      rotations: [run1, lax1]
    },
    {
      fullName: 'Mike TYSON',
      rotations: [lax1, sfo1]
    },
    {
      fullName: 'Roger FEDERER',
      rotations: [ewr1]
    },
    {
      fullName: 'Jason BOURNE',
      rotations: [sfoppt1]
    },
  ];

  const rosters2 = [
    {
      fullName: 'John DOE',
      csLogin: 'jdoe',
      rotations: [
        {
          flight1Start: new Date('2022-09-02T16:25:00Z'),
          flight1Number: '700',
          flight1End: new Date('2022-09-03T05:30:00Z'),
          destination: 'RUN',
          flight2Start: new Date('2022-09-05T18:10:00Z'),
          flight2Number: '701',
          flight2End: new Date('2022-09-06T06:00:00Z')
        },
        {
          flight1Start: new Date('2022-09-08T15:00:00Z'),
          flight1Number: '700',
          flight1End: new Date('2022-09-09T01:10:00Z'),
          destination: 'LAX',
          flight2Start: new Date('2022-09-10T00:40:00Z'),
          flight2Number: '701',
          flight2End: new Date('2022-09-10T11:30:00Z')
        }
      ]
    },
    {
      fullName: 'Mike TYSON',
      rotations: [lax1, sfo1]
    },
    {
      fullName: 'Roger FEDERER',
      rotations: [ewr1]
    },
    {
      fullName: 'Jason BOURNE',
      rotations: [sfoppt1]
    },
  ];

module.exports = { myRoster, rosters, emptyRoster, lanaRoster }
